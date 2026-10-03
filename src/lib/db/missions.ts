import { missionLeaseFence, missionWriteWhere, MISSION_LEASE_MS } from "@/lib/missions/lease";
import { LeaseLostError, executionContext } from "@/lib/missions/execution-context";
import { createPersonas } from "@/lib/mock-data";
import type { AuditConfigSnapshot } from "@/lib/audit-config/types";
import { hasCompetitorIntelligenceAccess } from "@/lib/competitor-intelligence/access";
import { parseCompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import type { GhostReport, MissionState } from "@/lib/types";
import { getEntitlementForMission } from "@/lib/db/entitlements";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value));
}

function missionProgress(state: MissionState) {
  return {
    currentStage: state.currentStage,
    stageProgress: state.stageProgress,
    personas: state.personas,
    startedAt: state.startedAt,
    progressLog: state.progressLog,
    detectedFlows: state.detectedFlows,
    customerSnippets: state.customerSnippets,
    error: state.error,
  };
}

/** Atomically merge top-level keys into mission.progress (no read-modify-write race). */
export async function patchMissionProgress(
  missionId: string,
  patch: Record<string, unknown>,
  options?: { status?: string },
): Promise<void> {
  const patchJson = JSON.stringify(patch);
  // Raw SQL bypasses Prisma @updatedAt — bump it or the stale-running
  // watchdog treats a live scan as abandoned after STALE_RUNNING_MS.
  if (options?.status) {
    const written = await db.$executeRaw`
      UPDATE "Mission"
      SET
        "progress" = COALESCE("progress"::jsonb, '{}'::jsonb) || ${patchJson}::jsonb,
        "status" = ${options.status},
        "updatedAt" = NOW()
      WHERE "id" = ${missionId} AND ${missionLeaseFence(missionId)}
    `;
    if (written === 0 && executionContext.getStore()) throw new LeaseLostError();
  } else {
    const written = await db.$executeRaw`
      UPDATE "Mission"
      SET
        "progress" = COALESCE("progress"::jsonb, '{}'::jsonb) || ${patchJson}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${missionId} AND ${missionLeaseFence(missionId)}
    `;
    if (written === 0 && executionContext.getStore()) throw new LeaseLostError();
  }
}

export async function persistMissionStart(input: {
  missionId: string;
  url: string;
  domain: string;
  userId: string;
  siteId?: string | null;
  auditType?: string;
  context?: Record<string, unknown> | null;
  auditConfigSnapshot?: AuditConfigSnapshot | null;
  baselineMissionId?: string | null;
  clientId?: string | null;
  idempotencyKey?: string | null;
}): Promise<void> {
  const startedAt = new Date().toISOString();
  const progressPayload = {
    currentStage: "opening",
    stageProgress: 0,
    personas: createPersonas(),
    startedAt,
    auditRunStatus: "pending",
    auditRunStartedAt: null,
    auditRunError: null,
  };

  await db.mission.upsert({
    where: { id: input.missionId },
    create: {
      id: input.missionId,
      url: input.url,
      domain: input.domain,
      userId: input.userId,
      siteId: input.siteId ?? null,
      clientId: input.clientId ?? null,
      auditType: input.auditType ?? "quick",
      baselineMissionId: input.baselineMissionId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      context: input.context ? toJson(input.context) : undefined,
      auditConfigSnapshot: input.auditConfigSnapshot
        ? toJson(input.auditConfigSnapshot)
        : undefined,
      status: "running",
      progress: toJson(progressPayload),
    },
    update: {
      url: input.url,
      domain: input.domain,
      userId: input.userId,
      siteId: input.siteId ?? null,
      clientId: input.clientId ?? null,
      auditType: input.auditType ?? "quick",
      baselineMissionId: input.baselineMissionId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      context: input.context ? toJson(input.context) : undefined,
      auditConfigSnapshot: input.auditConfigSnapshot
        ? toJson(input.auditConfigSnapshot)
        : undefined,
      status: "running",
      progress: toJson(progressPayload),
    },
  });
}

export async function findMissionByIdempotencyKey(idempotencyKey: string) {
  return db.mission.findUnique({
    where: { idempotencyKey },
    select: { id: true, status: true },
  });
}

export async function findRecentRunningMission(input: {
  userId: string;
  domain: string;
  windowMs?: number;
}) {
  const windowMs = input.windowMs ?? 60_000;
  return db.mission.findFirst({
    where: {
      userId: input.userId,
      domain: input.domain,
      status: "running",
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
}

export async function persistMissionPreviewUrl(
  missionId: string,
  previewUrl: string,
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: { previewUrl },
  });
}

export async function getMissionPreviewUrl(missionId: string): Promise<string | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { previewUrl: true },
  });
  return mission?.previewUrl ?? null;
}

export type AuditRunStatus = "pending" | "running" | "complete" | "failed";

export async function persistAuditRunStatus(
  missionId: string,
  input: {
    auditRunStatus: AuditRunStatus;
    auditRunStartedAt?: string | null;
    auditRunError?: string | null;
  },
): Promise<void> {
  await patchMissionProgress(missionId, {
    auditRunStatus: input.auditRunStatus,
    ...(input.auditRunStartedAt !== undefined
      ? { auditRunStartedAt: input.auditRunStartedAt }
      : {}),
    ...(input.auditRunError !== undefined ? { auditRunError: input.auditRunError } : {}),
  });
}

export async function getMissionAuditConfigSnapshot(
  missionId: string
): Promise<AuditConfigSnapshot | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { auditConfigSnapshot: true },
  });
  if (!mission?.auditConfigSnapshot) return null;
  return mission.auditConfigSnapshot as AuditConfigSnapshot;
}

export async function persistMissionProgress(
  missionId: string,
  state: MissionState
): Promise<void> {
  // Never write status=running from a progress tick — that clobbers
  // persistMissionReport's complete and leaves the UI stuck mid-scan.
  const options =
    state.status === "complete" || state.status === "error"
      ? { status: state.status }
      : undefined;
  await patchMissionProgress(missionId, missionProgress(state), options);
}

export type IntelStatus =
  | "running"
  | "complete"
  | "partial"
  | "failed"
  | "not_applicable";

export async function persistIntelStatus(
  missionId: string,
  input: { intelStatus: IntelStatus; intelError?: string | null },
): Promise<void> {
  await patchMissionProgress(missionId, {
    intelStatus: input.intelStatus,
    intelError: input.intelError ?? null,
    ...(input.intelStatus === "running"
      ? {}
      : { intelCompletedAt: new Date().toISOString() }),
  });
}

export async function persistMissionReport(
  missionId: string,
  report: GhostReport
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: {
      status: "complete",
      report: toJson(report),
    },
  });

  await patchMissionProgress(missionId, {
    currentStage: "generating",
    stageProgress: 80,
    startedAt: report.scannedAt,
    finalizeStatus: "pending",
    auditRunStatus: "complete",
    auditRunError: null,
  });
}

function looksLikeGhostReport(raw: unknown): boolean {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      "score" in raw &&
      "leaks" in raw &&
      Array.isArray((raw as { leaks: unknown }).leaks),
  );
}

export async function persistMissionError(
  missionId: string,
  error: string
): Promise<void> {
  const existing = await db.mission.findUnique({
    where: { id: missionId },
    select: { url: true, domain: true, report: true },
  });

  const keepReport = looksLikeGhostReport(existing?.report);

  await db.mission.upsert({
    where: missionWriteWhere(missionId),
    create: {
      id: missionId,
      url: existing?.url ?? "",
      domain: existing?.domain ?? "",
      status: "error",
      report: toJson({ error }),
      progress: toJson({ error }),
    },
    update: keepReport
      ? { status: "error" }
      : {
          status: "error",
          report: toJson({ error }),
        },
  });

  await patchMissionProgress(missionId, {
    error,
    auditRunStatus: "failed",
    auditRunError: error,
  });
}

/** Above run/finalize maxDuration — worker likely dead (serverless freeze / HMR). */
export const STALE_RUNNING_MS = MISSION_LEASE_MS;

export const STALE_RUNNING_ERROR =
  "This scan stopped unexpectedly. Please start a new audit.";

/**
 * If a mission is still `running` but has not been updated past the stale window,
 * leave it recoverable; the recovery cron dispatches a fresh leased worker.
 */
export async function expireStaleRunningMission(input: {
  missionId: string;
  status: string;
  updatedAt: Date;
}): Promise<boolean> {
  if (input.status !== "running") return false;
  if (Date.now() - input.updatedAt.getTime() < STALE_RUNNING_MS) return false;
  // Do not turn abandoned jobs into terminal errors: the cron must be able to reclaim them.
  // Atomic conditions also prevent a stale poll from overwriting a new worker or completed report.
  await db.$executeRaw`
    UPDATE "Mission" SET "progress" = COALESCE("progress", '{}'::jsonb) || '{"auditRunStatus":"pending"}'::jsonb
    WHERE "id" = ${input.missionId} AND "status" = 'running' AND "report" IS NULL
      AND "updatedAt" < clock_timestamp() - interval '15 minutes'
      AND ("progress"->'auditLease'->>'token' IS NULL
        OR COALESCE(("progress"->'auditLease'->>'expiresAt')::numeric, 0) <= extract(epoch from clock_timestamp()) * 1000)
  `;
  return false;
}

export async function getMissionReportFromDb(
  missionId: string
): Promise<GhostReport | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { report: true, status: true },
  });

  if (!mission?.report || mission.status !== "complete") {
    return null;
  }

  return mission.report as unknown as GhostReport;
}

export async function persistMissionPdf(
  missionId: string,
  input: { pdfUrl: string }
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: {
      pdfUrl: input.pdfUrl,
      pdfUploadedAt: new Date(),
    },
  });
}

export async function getMissionStoredPdf(missionId: string): Promise<{
  pdfUrl: string;
  pdfUploadedAt: Date | null;
} | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { pdfUrl: true, pdfUploadedAt: true, status: true },
  });

  if (!mission?.pdfUrl || mission.status !== "complete") return null;
  return { pdfUrl: mission.pdfUrl, pdfUploadedAt: mission.pdfUploadedAt };
}

export async function getMissionPdfUrlFromDb(missionId: string): Promise<string | null> {
  const stored = await getMissionStoredPdf(missionId);
  return stored?.pdfUrl ?? null;
}

export async function getMissionStatusFromDb(
  missionId: string
): Promise<MissionState | null> {
  // Select only poll fields — never pull report / competitor JSON blobs.
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: {
      id: true,
      url: true,
      domain: true,
      status: true,
      progress: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!mission) return null;

  const expired = await expireStaleRunningMission({
    missionId: mission.id,
    status: mission.status,
    updatedAt: mission.updatedAt,
  });

  const progress = (mission.progress ?? {}) as Partial<MissionState>;
  const status = (expired ? "error" : mission.status) as MissionState["status"];

  const state: MissionState = {
    id: mission.id,
    url: mission.url,
    domain: mission.domain,
    status,
    currentStage: progress.currentStage ?? "opening",
    stageProgress: progress.stageProgress ?? 0,
    personas: progress.personas ?? createPersonas(),
    startedAt: progress.startedAt ?? mission.createdAt.toISOString(),
    progressLog: progress.progressLog,
    detectedFlows: progress.detectedFlows,
    customerSnippets: progress.customerSnippets,
    error: expired ? STALE_RUNNING_ERROR : progress.error,
  };

  if (status === "complete") {
    return {
      ...state,
      status: "complete",
      currentStage: "generating",
      stageProgress: 100,
    };
  }

  if (status === "error") {
    return {
      ...state,
      status: "error",
      error: state.error ?? "Mission failed",
    };
  }

  return state;
}

export type RecentMissionRow = {
  id: string;
  url: string;
  domain: string;
  status: string;
  auditType?: string;
  score?: number | null;
  criticalCount?: number;
  createdAt: Date;
  updatedAt: Date;
  pdfUrl?: string | null;
  progress?: {
    currentStage?: MissionState["currentStage"];
    stageProgress?: number;
    error?: string;
  } | null;
};

export type OverviewMissionRow = RecentMissionRow & {
  topLeakTitle?: string | null;
  topLeakSeverity?: string | null;
  topLeakPage?: string | null;
};

export async function getRecentMissionsForUser(input: {
  userId: string;
  limit?: number;
}): Promise<RecentMissionRow[]> {
  const rows = await queryMissionOverviewRows(input.userId, input.limit ?? 12);
  return rows.map(({ topLeakTitle, topLeakSeverity, topLeakPage, ...rest }) => rest);
}

export async function getOverviewMissionsForUser(input: {
  userId: string;
  limit?: number;
}): Promise<OverviewMissionRow[]> {
  return queryMissionOverviewRows(input.userId, input.limit ?? 5);
}

async function queryMissionOverviewRows(userId: string, limit: number) {
  // `progress` can be hundreds of KB per row (it may embed a base64 preview
  // screenshot), so project only the keys the profile list actually renders
  // instead of pulling the whole JSON column across the wire.
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      url: string;
      domain: string;
      status: string;
      auditType: string;
      pdfUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
      currentStage: string | null;
      stageProgress: number | null;
      error: string | null;
      score: number | null;
      criticalCount: number | null;
      topLeakTitle: string | null;
      topLeakSeverity: string | null;
      topLeakPage: string | null;
    }>
  >`
    SELECT id, url, domain, status, "auditType", "pdfUrl", "createdAt", "updatedAt",
           progress->>'currentStage'           AS "currentStage",
           (progress->>'stageProgress')::float AS "stageProgress",
           progress->>'error'                  AS "error",
           (report->>'score')::float           AS "score",
           (
             SELECT COUNT(*)::int
             FROM jsonb_array_elements(COALESCE(report->'leaks', '[]'::jsonb)) AS leak
             WHERE leak->>'severity' = 'critical'
           ) AS "criticalCount",
           report->'leaks'->0->>'title'         AS "topLeakTitle",
           report->'leaks'->0->>'severity'     AS "topLeakSeverity",
           report->'leaks'->0->>'page'         AS "topLeakPage"
    FROM "Mission"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}`;

  return rows.map(
    ({
      currentStage,
      stageProgress,
      error,
      score,
      criticalCount,
      topLeakTitle,
      topLeakSeverity,
      topLeakPage,
      ...rest
    }) => ({
      ...rest,
      score: score ?? undefined,
      criticalCount: criticalCount ?? undefined,
      topLeakTitle: topLeakTitle ?? undefined,
      topLeakSeverity: topLeakSeverity ?? undefined,
      topLeakPage: topLeakPage ?? undefined,
      progress: {
        currentStage:
          (currentStage as MissionState["currentStage"] | null) ?? undefined,
        stageProgress: stageProgress ?? undefined,
        error: error ?? undefined,
      },
    })
  );
}

export type AuditMissionRow = OverviewMissionRow & {
  siteId?: string | null;
  hasIntel?: boolean;
  intelStatus?: string | null;
  highCount?: number;
  shopperCount?: number;
  scoreDelta?: number | null;
  clientName?: string | null;
};

/**
 * A mission is "queued" when it has been created but the crawl hasn't started
 * moving yet. Expressed in SQL so the filter runs in Postgres, not in Node.
 */
const QUEUED_PREDICATE = Prisma.sql`
  m.status = 'running'
  AND m.progress->>'currentStage' = 'opening'
  AND ((m.progress->>'stageProgress') IS NULL OR (m.progress->>'stageProgress')::float <= 0)`;

export async function getAuditsForUser(input: {
  userId: string;
  search?: string;
  status?: string;
  auditType?: string;
  from?: Date;
  to?: Date;
  clientId?: string;
  limit?: number;
}): Promise<AuditMissionRow[]> {
  const limit = input.limit ?? 200;
  const search = input.search?.trim();

  const conditions: Prisma.Sql[] = [Prisma.sql`m."userId" = ${input.userId}`];

  if (input.auditType) {
    conditions.push(Prisma.sql`m."auditType" = ${input.auditType}`);
  }
  if (input.clientId) {
    conditions.push(Prisma.sql`m."clientId" = ${input.clientId}`);
  }
  // `createdAt` is `timestamp without time zone` holding UTC. A JS Date bound
  // through $queryRaw does not compare correctly against it, and `::timestamptz`
  // would re-interpret the value in the session timezone — so bind the UTC ISO
  // string and cast to plain `timestamp`.
  if (input.from) {
    conditions.push(
      Prisma.sql`m."createdAt" >= ${input.from.toISOString()}::timestamp`
    );
  }
  if (input.to) {
    conditions.push(
      Prisma.sql`m."createdAt" <= ${input.to.toISOString()}::timestamp`
    );
  }
  if (search) {
    // Escape LIKE metacharacters so a literal "_" or "%" typed into the search
    // box stays literal (Prisma's `contains` did this for us).
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      Prisma.sql`(
        m.domain ILIKE ${like} ESCAPE '\\'
        OR m.url ILIKE ${like} ESCAPE '\\'
        OR c.name ILIKE ${like} ESCAPE '\\'
      )`
    );
  }

  // "queued" and "running" are UI pseudo-statuses derived from progress.
  if (input.status === "queued") {
    conditions.push(Prisma.sql`(${QUEUED_PREDICATE})`);
  } else if (input.status === "running") {
    conditions.push(Prisma.sql`m.status = 'running' AND NOT (${QUEUED_PREDICATE})`);
  } else if (input.status) {
    conditions.push(Prisma.sql`m.status = ${input.status}`);
  }

  const where = Prisma.join(conditions, " AND ");

  // Project the handful of scalars the table renders instead of streaming the
  // whole `report` / `progress` JSON (hundreds of KB per row) out of Postgres.
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      url: string;
      domain: string;
      status: string;
      auditType: string;
      pdfUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
      currentStage: string | null;
      stageProgress: number | null;
      error: string | null;
      score: number | null;
      criticalCount: number | null;
      highCount: number | null;
      shopperCount: number | null;
      topLeakTitle: string | null;
      topLeakSeverity: string | null;
      topLeakPage: string | null;
      clientName: string | null;
      siteId: string | null;
      hasIntel: boolean;
      intelStatus: string | null;
    }>
  >`
    SELECT m.id, m.url, m.domain, m.status, m."auditType", m."pdfUrl",
           m."createdAt", m."updatedAt",
           m."siteId"                            AS "siteId",
           (m."competitorIntelligence" IS NOT NULL) AS "hasIntel",
           m.progress->>'intelStatus'            AS "intelStatus",
           m.progress->>'currentStage'           AS "currentStage",
           (m.progress->>'stageProgress')::float AS "stageProgress",
           m.progress->>'error'                  AS "error",
           (m.report->>'score')::float           AS "score",
           (
             SELECT COUNT(*)::int
             FROM jsonb_array_elements(COALESCE(m.report->'leaks', '[]'::jsonb)) AS leak
             WHERE leak->>'severity' = 'critical'
           ) AS "criticalCount",
           (
             SELECT COUNT(*)::int
             FROM jsonb_array_elements(COALESCE(m.report->'leaks', '[]'::jsonb)) AS leak
             WHERE leak->>'severity' = 'high'
           ) AS "highCount",
           CASE
             WHEN jsonb_typeof(m.progress->'personas') = 'array'
               THEN jsonb_array_length(m.progress->'personas')
             ELSE NULL
           END AS "shopperCount",
           m.report->'leaks'->0->>'title'    AS "topLeakTitle",
           m.report->'leaks'->0->>'severity' AS "topLeakSeverity",
           m.report->'leaks'->0->>'page'     AS "topLeakPage",
           c.name AS "clientName"
    FROM "Mission" m
    LEFT JOIN "Client" c ON c.id = m."clientId"
    WHERE ${where}
    ORDER BY m."createdAt" DESC
    LIMIT ${limit}`;

  const mapped: AuditMissionRow[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    domain: r.domain,
    status: r.status,
    auditType: r.auditType,
    pdfUrl: r.pdfUrl,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    score: r.score ?? undefined,
    criticalCount: r.criticalCount ?? 0,
    highCount: r.highCount ?? 0,
    shopperCount: r.shopperCount ?? undefined,
    topLeakTitle: r.topLeakTitle ?? undefined,
    topLeakSeverity: r.topLeakSeverity ?? undefined,
    topLeakPage: r.topLeakPage ?? undefined,
    clientName: r.clientName ?? null,
    siteId: r.siteId ?? null,
    hasIntel: Boolean(r.hasIntel),
    intelStatus: r.intelStatus ?? null,
    progress: {
      currentStage:
        (r.currentStage as MissionState["currentStage"] | null) ?? undefined,
      stageProgress: r.stageProgress ?? undefined,
      error: r.error ?? undefined,
    },
    scoreDelta: null,
  }));

  const scoreByDomain = new Map<string, number[]>();
  for (const m of mapped) {
    if (m.status === "complete" && m.score != null) {
      const d = m.domain.toLowerCase();
      const list = scoreByDomain.get(d) ?? [];
      list.push(m.score);
      scoreByDomain.set(d, list);
    }
  }

  return mapped.map((m) => {
    const domainScores = scoreByDomain.get(m.domain.toLowerCase()) ?? [];
    const idx = domainScores.indexOf(m.score ?? -1);
    const prior = idx >= 0 ? domainScores[idx + 1] : undefined;
    return {
      ...m,
      scoreDelta:
        m.score != null && prior != null ? Math.round(m.score - prior) : null,
    };
  });
}

export async function getMissionOwner(missionId: string): Promise<string | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { userId: true },
  });
  return mission?.userId ?? null;
}

export async function persistCompetitorCandidates(
  missionId: string,
  candidates: unknown,
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: { competitorCandidates: toJson(candidates) },
  });
}

export async function persistCompetitorCrawlPacks(
  missionId: string,
  packs: unknown,
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: { competitorCrawlPacks: toJson(packs) },
  });
}

export async function persistCompetitorIntelligence(
  missionId: string,
  intelligence: unknown,
): Promise<void> {
  await db.mission.update({
    where: missionWriteWhere(missionId),
    data: {
      competitorIntelligence: toJson(intelligence),
      pdfUrl: null,
      pdfUploadedAt: null,
    },
  });
}

/**
 * Only the intelligence blob — deliberately *not* `competitorCrawlPacks`,
 * which holds the raw competitor page text (multiple MB per deep audit) and is
 * never read on the report or PDF paths.
 */
export async function getCompetitorIntelligenceForMission(missionId: string) {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { competitorIntelligence: true },
  });
  if (!mission) return null;
  return { competitorIntelligence: mission.competitorIntelligence };
}

export async function findLatestDeepMissionWithIntelligence(input: {
  userId: string;
  siteId?: string;
  domain?: string;
}) {
  const mission = await db.mission.findFirst({
    where: {
      userId: input.userId,
      status: "complete",
      auditType: "deep",
      competitorIntelligence: { not: Prisma.DbNull },
      ...(input.siteId ? { siteId: input.siteId } : {}),
      ...(input.domain
        ? { domain: { equals: input.domain, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      siteId: true,
      createdAt: true,
      competitorIntelligence: true,
    },
  });
  return mission;
}

export type MissionIntelMeta = {
  intelStatus: IntelStatus | null;
  intelError: string | null;
  hasCompetitorCrawlPacks: boolean;
  marketIntelExpected: boolean;
};

/** Intel progress + whether market comparison should have been produced for this mission. */
export async function getMissionIntelMeta(
  missionId: string,
): Promise<MissionIntelMeta | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: {
      progress: true,
      competitorIntelligence: true,
      competitorCrawlPacks: true,
      auditType: true,
    },
  });
  if (!mission) return null;

  const entitlement = await getEntitlementForMission(missionId);
  const hasAccess = entitlement
    ? hasCompetitorIntelligenceAccess({
        planId: entitlement.planId,
        auditType: mission.auditType,
      })
    : false;
  const hasIntel = Boolean(parseCompetitorIntelligence(mission.competitorIntelligence));
  const progress = (mission.progress ?? {}) as Record<string, unknown>;

  return {
    intelStatus: (progress.intelStatus as IntelStatus) ?? null,
    intelError: (progress.intelError as string) ?? null,
    hasCompetitorCrawlPacks: mission.competitorCrawlPacks != null,
    marketIntelExpected: hasAccess && !hasIntel,
  };
}

export async function findLatestDeepMissionForUser(input: {
  userId: string;
  siteId?: string;
  domain?: string;
}) {
  return db.mission.findFirst({
    where: {
      userId: input.userId,
      status: "complete",
      auditType: { notIn: ["quick", "rescan"] },
      ...(input.siteId ? { siteId: input.siteId } : {}),
      ...(input.domain
        ? { domain: { equals: input.domain, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      siteId: true,
      createdAt: true,
    },
  });
}

