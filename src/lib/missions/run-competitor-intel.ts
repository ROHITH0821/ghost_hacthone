import { hasCompetitorIntelligenceAccess } from "@/lib/competitor-intelligence/access";
import { runCompetitorIntelligencePipeline } from "@/lib/competitor-intelligence/pipeline";
import {
  parseCompetitorIntelligence,
  type CompetitorIntelligence,
} from "@/lib/competitor-intelligence/types";
import { db } from "@/lib/db";
import { getEntitlementForMission } from "@/lib/db/entitlements";
import {
  getMissionAuditConfigSnapshot,
  patchMissionProgress,
  persistCompetitorCandidates,
  persistCompetitorCrawlPacks,
  persistCompetitorIntelligence,
  persistIntelStatus,
} from "@/lib/db/missions";
import type { ContextPack } from "@/lib/ghost-engine/types";
import { withTimeout } from "@/lib/ghost-engine/util";
import type { GhostReport } from "@/lib/types";

import { COMPETITOR_INTEL_BUDGET_MS } from "./finalize-config";

export type IntelStatus = "complete" | "partial" | "failed" | "not_applicable";

export type CompetitorIntelResult = {
  status: IntelStatus;
  intelligence: CompetitorIntelligence | null;
  error?: string;
};

const MAX_ATTEMPTS = 2;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function isEligibleForCompetitorIntel(missionId: string): Promise<boolean> {
  const missionRow = await db.mission.findUnique({
    where: { id: missionId },
    select: { auditType: true },
  });
  if (!missionRow) return false;

  const entitlement = await getEntitlementForMission(missionId);
  if (!entitlement) return false;

  return hasCompetitorIntelligenceAccess({
    planId: entitlement.planId,
    auditType: missionRow.auditType,
  });
}

async function runMissionCompetitorIntelOnce(input: {
  missionId: string;
  url: string;
  domain: string;
  ownerContextPack: ContextPack;
  ownerReport: GhostReport;
  budgetMs: number;
  onProgress?: (message: string) => void;
}): Promise<CompetitorIntelResult> {
  try {
    const auditConfigSnapshot = await getMissionAuditConfigSnapshot(input.missionId);
    const result = await withTimeout(
      runCompetitorIntelligencePipeline({
        missionId: input.missionId,
        ownerUrl: input.url,
        ownerDomain: input.domain,
        ownerContextPack: input.ownerContextPack,
        ownerReport: input.ownerReport,
        auditConfigSnapshot,
        events: {
          onProgress: (message) => input.onProgress?.(message),
        },
      }),
      input.budgetMs,
      "Competitor intelligence",
    );

    await persistCompetitorCandidates(input.missionId, result.candidates);
    await persistCompetitorCrawlPacks(input.missionId, result.crawlPacks);
    await persistCompetitorIntelligence(input.missionId, result.intelligence);

    const hasGaps = result.intelligence.market_gaps.length > 0;
    const status: IntelStatus =
      hasGaps || result.crawlPacks.length > 0 ? "complete" : "partial";

    console.log(`[audit] intel_ok mission=${input.missionId} status=${status}`);
    return { status, intelligence: result.intelligence };
  } catch (error) {
    const msg = errorMessage(error);
    const isTimeout = msg.includes("timed out");
    console.error(
      `[audit] ${isTimeout ? "intel_timeout" : "intel_fail"} mission=${input.missionId}:`,
      msg,
    );
    return { status: "failed", intelligence: null, error: msg };
  }
}

/**
 * Run competitor intelligence for eligible deep audits.
 * Never throws — low-confidence owner crawls still attempt intel using the real ContextPack.
 */
export async function runMissionCompetitorIntel(input: {
  missionId: string;
  url: string;
  domain: string;
  ownerContextPack: ContextPack;
  ownerReport: GhostReport;
  budgetMs?: number;
  onProgress?: (message: string) => void;
}): Promise<CompetitorIntelResult> {
  const eligible = await isEligibleForCompetitorIntel(input.missionId);
  if (!eligible) {
    await persistIntelStatus(input.missionId, { intelStatus: "not_applicable" });
    return { status: "not_applicable", intelligence: null };
  }

  const existing = parseCompetitorIntelligence(
    (
      await db.mission.findUnique({
        where: { id: input.missionId },
        select: { competitorIntelligence: true },
      })
    )?.competitorIntelligence,
  );
  if (existing) {
    await persistIntelStatus(input.missionId, { intelStatus: "complete" });
    return { status: "complete", intelligence: existing };
  }

  const budgetMs = input.budgetMs ?? COMPETITOR_INTEL_BUDGET_MS;
  let lastResult: CompetitorIntelResult = {
    status: "failed",
    intelligence: null,
  };

  await persistIntelStatus(input.missionId, { intelStatus: "running" });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await patchMissionProgress(input.missionId, { intelAttemptCount: attempt });

    if (attempt === 1) {
      input.onProgress?.("Analyzing market competitors…");
      console.log(`[audit] intel_start mission=${input.missionId} budgetMs=${budgetMs}`);
    } else {
      console.log(`[audit] intel_retry mission=${input.missionId} attempt=${attempt}`);
      input.onProgress?.("Retrying market intelligence…");
    }

    lastResult = await runMissionCompetitorIntelOnce({
      ...input,
      budgetMs,
    });

    if (lastResult.status !== "failed") {
      await persistIntelStatus(input.missionId, {
        intelStatus: lastResult.status,
        intelError: lastResult.error ?? null,
      });
      return lastResult;
    }
  }

  await persistIntelStatus(input.missionId, {
    intelStatus: lastResult.status,
    intelError: lastResult.error ?? null,
  });
  return lastResult;
}

/** Retry intel during backfill/cron when force flag set and prior attempt failed. */
export async function retryMissionCompetitorIntelIfNeeded(input: {
  missionId: string;
  url: string;
  domain: string;
  ownerReport: GhostReport;
  force?: boolean;
  budgetMs?: number;
}): Promise<CompetitorIntelResult | null> {
  if (!input.force) return null;

  const mission = await db.mission.findUnique({
    where: { id: input.missionId },
    select: { progress: true, competitorIntelligence: true },
  });
  if (!mission) return null;

  const progress = (mission.progress ?? {}) as { intelStatus?: IntelStatus };
  const hasIntel = Boolean(parseCompetitorIntelligence(mission.competitorIntelligence));
  if (hasIntel) return null;
  if (progress.intelStatus === "not_applicable") return null;
  if (!input.force && progress.intelStatus === "complete") return null;

  const eligible = await isEligibleForCompetitorIntel(input.missionId);
  if (!eligible) return null;

  const { contextPackFromReport } = await import(
    "@/lib/competitor-intelligence/context-from-report"
  );

  return runMissionCompetitorIntel({
    missionId: input.missionId,
    url: input.url,
    domain: input.domain,
    ownerContextPack: contextPackFromReport(input.ownerReport),
    ownerReport: input.ownerReport,
    budgetMs: input.budgetMs,
  });
}
