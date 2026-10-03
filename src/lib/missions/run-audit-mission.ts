import { acquireMissionLease, withMissionLease, missionWriteWhere } from "./lease";
import { executionLog } from "./execution-context";
import { runGhostAudit } from "@/lib/api/ghost-api";
import { db } from "@/lib/db";
import {
  persistAuditRunStatus,
  persistMissionError,
  type AuditRunStatus,
} from "@/lib/db/missions";
import { Prisma } from "@prisma/client";

export type AuditRunProgress = {
  auditRunStatus?: AuditRunStatus;
  auditRunStartedAt?: string | null;
  auditRunError?: string | null;
};

export type AuditRunResult = {
  ok: boolean;
  skipped: boolean;
  errors: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadMissionForRun(missionId: string) {
  return db.mission.findUnique({
    where: { id: missionId },
    select: {
      id: true,
      url: true,
      domain: true,
      status: true,
      report: true,
      progress: true,
    },
  });
}

export async function isAuditRunComplete(missionId: string): Promise<boolean> {
  const mission = await loadMissionForRun(missionId);
  if (!mission) return false;
  if (mission.status === "complete" && mission.report) return true;
  const progress = (mission.progress ?? {}) as AuditRunProgress;
  return progress.auditRunStatus === "complete";
}

export async function markAuditRunPending(missionId: string): Promise<void> {
  await persistAuditRunStatus(missionId, {
    auditRunStatus: "pending",
    auditRunStartedAt: null,
    auditRunError: null,
  });
}

async function markAuditRunStarted(missionId: string): Promise<void> {
  await persistAuditRunStatus(missionId, {
    auditRunStatus: "running",
    auditRunStartedAt: new Date().toISOString(),
    auditRunError: null,
  });
}

/**
 * Crawl → audit → competitor intel → persist report on a dedicated serverless invocation.
 */
async function executeAuditMission(
  missionId: string,
  options?: { force?: boolean },
): Promise<AuditRunResult> {
  const mission = await loadMissionForRun(missionId);
  if (!mission) {
    return {
      ok: false,
      skipped: false,
      errors: ["Mission not found"],
    };
  }

  const hasReport = mission.status === "complete" && mission.report != null;

  if (!options?.force) {
    if (mission.status === "complete" || hasReport) {
      console.log(`[audit] skip mission=${missionId} already complete`);
      return { ok: true, skipped: true, errors: [] };
    }
    if (mission.status === "error") {
      console.log(`[audit] skip mission=${missionId} status=error`);
      return { ok: false, skipped: true, errors: ["Mission is in error state"] };
    }

  }

  if (!mission.url?.trim()) {
    await persistMissionError(missionId, "Mission has no URL");
    return {
      ok: false,
      skipped: false,
      errors: ["Mission has no URL"],
    };
  }

  console.log(`[audit] run_start mission=${missionId}`);
  await markAuditRunStarted(missionId);

  try {
    await runGhostAudit(missionId, mission.url, mission.domain);
  } catch (error) {
    const msg = errorMessage(error);
    await persistMissionError(missionId, "The audit could not finish. Please try again.");
    console.error(`[audit] run_fail mission=${missionId}:`, msg);
    return { ok: false, skipped: false, errors: [msg] };
  }

  const after = await loadMissionForRun(missionId);
  if (after?.status === "complete" && after.report) {
    console.log(`[audit] run_ok mission=${missionId}`);
    return { ok: true, skipped: false, errors: [] };
  }

  if (after?.status === "error") {
    const err =
      ((after.progress ?? {}) as AuditRunProgress).auditRunError ??
      "Audit ended in error state";
    return { ok: false, skipped: false, errors: [err] };
  }

  return {
    ok: false,
    skipped: false,
    errors: ["Audit finished without a persisted report"],
  };
}

/** The lease is required even for forced runs; completed reports are never duplicated. */
export async function runAuditMission(missionId: string, options?: { force?: boolean }): Promise<AuditRunResult> {
  const lease = await acquireMissionLease(missionId, "audit", options?.force);
  if (!lease) {
    const mission = await loadMissionForRun(missionId);
    if (!mission) return { ok: false, skipped: false, errors: ["Mission not found"] };
    if (mission.status === "error" && !options?.force) return { ok: false, skipped: true, errors: ["Mission is in error state"] };
    return { ok: true, skipped: true, errors: [] };
  }
  return withMissionLease(lease, async () => {
    if (options?.force) {
      await db.mission.update({ where: missionWriteWhere(missionId), data: { status: "running", report: Prisma.DbNull } });
    }
    const result = await executeAuditMission(missionId, options);
    if (!result.ok) lease.failure ??= "audit_failed";
    executionLog("mission.outcome", { ok: result.ok, failure: result.ok ? null : "audit_failed" });
    return result;
  });
}

/** Filter eligible jobs in SQL before LIMIT so old completed/active rows cannot starve the queue. */
export async function findMissionsNeedingRun(limit: number): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Mission" WHERE "status" = 'running' AND "report" IS NULL
      AND ("progress"->'auditLease'->>'token' IS NULL
        OR COALESCE(("progress"->'auditLease'->>'expiresAt')::numeric, 0) <= extract(epoch from clock_timestamp()) * 1000)
      AND ("progress"->'auditLease' IS NOT NULL
        OR COALESCE("progress"->>'auditRunStatus', '') <> 'running'
        OR "updatedAt" < clock_timestamp() - interval '15 minutes')
    ORDER BY "createdAt" ASC LIMIT ${Math.max(1, Math.floor(limit))}
  `;
  return rows.map(row => row.id);
}
