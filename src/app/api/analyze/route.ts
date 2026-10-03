import { NextRequest, NextResponse } from "next/server";
import { getMissionStatus, startGhostMission } from "@/lib/api/ghost-api";
import { getSession } from "@/lib/auth";
import { assertMissionAccess, MissionAccessError } from "@/lib/auth/mission-access";
import { copy } from "@/lib/copy";
import {
  activateRescanWindowOnDeepAudit,
  bindEntitlementToUrl,
  consumeFreeScan,
  consumeRescan,
  validateScanEntitlement,
} from "@/lib/db/entitlements";
import { consumeAgencyAudit } from "@/lib/db/agency-quota";
import { linkSiteToClient } from "@/lib/db/clients";
import { db } from "@/lib/db";
import { buildAuditConfigSnapshot } from "@/lib/audit-config/build-snapshot";
import type { AuditContextInput } from "@/lib/audit-config/types";
import { assertAuditRateLimit } from "@/lib/db/audit-rate-limit";
import { AUDIT_DEDUP_WINDOW_MS } from "@/lib/db/audit-limits";
import {
  findMissionByIdempotencyKey,
  findRecentRunningMission,
  persistMissionStart,
} from "@/lib/db/missions";
import { findLatestBaselineMission } from "@/lib/db/comparisons";
import { canonicalizeDomain, upsertSiteForUser } from "@/lib/db/sites";
import { isUserApproved, resolveUserIdFromSession } from "@/lib/db/users";
import { NO_STORE } from "@/lib/http/cache-headers";
import { ENGINE_OFFLINE_CODE, isEngineConfigured } from "@/lib/engine/status";
import type { AuditType, ProductChoice } from "@/lib/plans";
import { PLAN_IDS } from "@/lib/plans";
import { scheduleMissionRun } from "@/lib/missions/trigger-mission-run";
import { generateMissionId } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Poll payload caps — the mission UI renders 6 log lines, 6 snippets, 8 flows. */
const POLL_LOG_ENTRIES = 12;
const POLL_SNIPPETS = 6;
const POLL_FLOWS = 8;

async function requireSession() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: copy.authApi.authRequired },
      { status: 401 }
    );
  }
  return session;
}

function deduplicatedResponse(missionId: string) {
  return NextResponse.json({
    missionId,
    status: "started" as const,
    deduplicated: true,
  });
}

function isIdempotencyKeyConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    if (!isEngineConfigured()) {
      return NextResponse.json(
        {
          error: copy.authApi.engineOffline,
          code: ENGINE_OFFLINE_CODE,
          message: copy.maintenance.body,
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: copy.authApi.urlRequired }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    const domain = canonicalizeDomain(trimmedUrl);
    const userId = await resolveUserIdFromSession(session.userId, session.email);

    if (!(await isUserApproved(userId))) {
      return NextResponse.json(
        { error: copy.earlyAccess.body },
        { status: 403 }
      );
    }

    const validation = await validateScanEntitlement({
      userId,
      url: trimmedUrl,
      productChoice: body.productChoice as ProductChoice | undefined,
      auditType: body.auditType as AuditType | undefined,
      authorized: body.authorized !== false,
      bindConfirmed: body.bindConfirmed === true,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const rateLimit = await assertAuditRateLimit(userId);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error, code: rateLimit.code },
        { status: 429 },
      );
    }

    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : null;

    if (idempotencyKey) {
      const existing = await findMissionByIdempotencyKey(idempotencyKey);
      if (existing) {
        return deduplicatedResponse(existing.id);
      }
    }

    const canonicalDomain = canonicalizeDomain(trimmedUrl);
    const recent = await findRecentRunningMission({
      userId,
      domain: canonicalDomain,
      windowMs: AUDIT_DEDUP_WINDOW_MS,
    });
    if (recent) {
      return deduplicatedResponse(recent.id);
    }

    const missionId = generateMissionId();

    if (validation.entitlementIdToBind) {
      await bindEntitlementToUrl({
        entitlementId: validation.entitlementIdToBind,
        userId,
        url: trimmedUrl,
      });
    }

    if (validation.auditType === "deep" && validation.planId === PLAN_IDS.deep999) {
      await activateRescanWindowOnDeepAudit({
        userId,
        domain: canonicalDomain,
      });
    }

    const clientId = typeof body.clientId === "string" ? body.clientId : null;

    const site = await upsertSiteForUser({
      userId,
      url: trimmedUrl,
      displayName: typeof body.businessName === "string" ? body.businessName : undefined,
    });

    if (clientId) {
      await linkSiteToClient({ userId, clientId, url: trimmedUrl });
      await db.site.update({
        where: { id: site.id },
        data: { clientId },
      });
    }

    let baselineMissionId: string | null =
      typeof body.baselineMissionId === "string" ? body.baselineMissionId : null;

    if (validation.auditType === "rescan" && !baselineMissionId) {
      const baseline = await findLatestBaselineMission({
        userId,
        siteId: site.id,
      });
      baselineMissionId = baseline?.id ?? null;
    }

    const auditConfigSnapshot = await buildAuditConfigSnapshot({
      userId,
      url: trimmedUrl,
      domain,
      businessName: typeof body.businessName === "string" ? body.businessName : undefined,
      productChoice: body.productChoice as ProductChoice | undefined,
      validation,
      context: (body.context as AuditContextInput | undefined) ?? null,
      clientId,
    });

    try {
      await persistMissionStart({
        missionId,
        url: trimmedUrl,
        domain,
        userId,
        siteId: site.id,
        clientId,
        auditType: validation.auditType,
        context: body.context ?? null,
        auditConfigSnapshot,
        baselineMissionId,
        idempotencyKey,
      });
    } catch (error) {
      if (idempotencyKey && isIdempotencyKeyConflict(error)) {
        const existing = await findMissionByIdempotencyKey(idempotencyKey);
        if (existing) return deduplicatedResponse(existing.id);
      }
      throw error;
    }

    if (validation.consumeFree) {
      await consumeFreeScan(userId);
    }
    if (validation.consumeRescan) {
      await consumeRescan(userId, canonicalDomain);
    }
    if (validation.consumeAgency) {
      await consumeAgencyAudit(userId);
    }

    const result = await startGhostMission({ url: trimmedUrl, missionId });

    scheduleMissionRun(missionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analyze]", error);
    return NextResponse.json(
      { error: copy.authApi.missionFailed },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const missionId = request.nextUrl.searchParams.get("missionId");

  if (!missionId) {
    return NextResponse.json(
      { error: copy.authApi.missionIdRequired },
      { status: 400 }
    );
  }

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    await assertMissionAccess(missionId, userId);
  } catch (error) {
    if (error instanceof MissionAccessError) {
      return NextResponse.json(
        { error: copy.authApi.missionNotFound },
        { status: error.code === "forbidden" ? 403 : 404 }
      );
    }
    throw error;
  }

  const mission = await getMissionStatus(missionId);
  if (!mission) {
    return NextResponse.json({ error: copy.authApi.missionNotFound }, { status: 404 });
  }

  const pollMission = {
    ...mission,
    progressLog: mission.progressLog?.slice(-POLL_LOG_ENTRIES),
    detectedFlows: mission.detectedFlows?.slice(0, POLL_FLOWS),
    customerSnippets: mission.customerSnippets?.slice(-POLL_SNIPPETS).map((s) => ({
      ...s,
      steps: s.steps.map(({ page, action }) => ({ page, action })),
    })),
  };

  return NextResponse.json(
    { mission: pollMission },
    { headers: { "Cache-Control": NO_STORE } }
  );
}
