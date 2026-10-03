import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { assertMissionAccess, MissionAccessError } from "@/lib/auth/mission-access";
import { hasCompetitorIntelligenceAccess } from "@/lib/competitor-intelligence/access";
import { contextPackFromReport } from "@/lib/competitor-intelligence/context-from-report";
import { regenerateIntelligenceFromCache } from "@/lib/competitor-intelligence/pipeline";
import { parseCompetitorCrawlPacks, parseCompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { copy } from "@/lib/copy";
import { getEntitlementForMission } from "@/lib/db/entitlements";
import {
  persistCompetitorIntelligence,
} from "@/lib/db/missions";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { scheduleMissionFinalize } from "@/lib/missions/trigger-finalize";
import type { GhostReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: copy.authApi.authRequired }, { status: 401 });
  }

  const { id: missionId } = await params;

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    await assertMissionAccess(missionId, userId);
  } catch (error) {
    if (error instanceof MissionAccessError) {
      return NextResponse.json(
        { error: copy.authApi.reportNotFound },
        { status: error.code === "forbidden" ? 403 : 404 },
      );
    }
    throw error;
  }

  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { report: true, url: true, auditType: true, competitorCrawlPacks: true, competitorIntelligence: true },
  });

  if (!mission?.report) {
    return NextResponse.json({ error: "Mission report not found" }, { status: 404 });
  }

  const entitlement = await getEntitlementForMission(missionId);
  if (
    !entitlement ||
    !hasCompetitorIntelligenceAccess({
      planId: entitlement.planId,
      auditType: mission.auditType,
    })
  ) {
    return NextResponse.json({ error: "Competitor intelligence not entitled" }, { status: 403 });
  }

  const crawlPacks = parseCompetitorCrawlPacks(mission.competitorCrawlPacks);
  if (crawlPacks.length === 0) {
    return NextResponse.json(
      { error: "No cached competitor crawl packs — run a deep audit first" },
      { status: 400 },
    );
  }

  const report = mission.report as unknown as GhostReport;
  const existing = parseCompetitorIntelligence(mission.competitorIntelligence);

  const REGEN_COOLDOWN_MS = 5 * 60 * 1000;
  if (existing?.generatedAt) {
    const generatedAt = Date.parse(existing.generatedAt);
    if (!Number.isNaN(generatedAt)) {
      const elapsed = Date.now() - generatedAt;
      if (elapsed < REGEN_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((REGEN_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          {
            error: copy.marketIntelligence.regenerateCooldown,
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSeconds) },
          },
        );
      }
    }
  }

  const searchMeta = existing?.search_strategy ?? { queries: [], sourcesUsed: ["cached_crawl"] };

  const intelligence = await regenerateIntelligenceFromCache({
    missionId,
    ownerUrl: mission.url,
    ownerContextPack: contextPackFromReport(report),
    ownerReport: report,
    crawlPacks,
    searchMeta,
  });

  await persistCompetitorIntelligence(missionId, intelligence);

  scheduleMissionFinalize(missionId);

  return NextResponse.json({ competitorIntelligence: intelligence });
}
