import type { ConversionLeak, GhostReport, GhostScoreDimensionId } from "@/lib/types";
import { db } from "@/lib/db";
import { getAccountEntitlements } from "@/lib/db/entitlements";
import { findLatestDeepMissionWithIntelligence } from "@/lib/db/missions";
import { parseCompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { isUserApproved } from "@/lib/db/users";
import { PLAN_IDS } from "@/lib/plans";

export type RescanPair = {
  siteId: string;
  siteDomain: string;
  baselineMissionId: string;
  rescanMissionId: string;
  baselineCreatedAt: Date;
  rescanCreatedAt: Date;
  baselineScore: number | null;
  rescanScore: number | null;
};

export type LeakDiffItem = ConversionLeak & { matchKey: string };

export type RescanComparison = {
  baselineMissionId: string;
  rescanMissionId: string;
  baselineScore: number;
  rescanScore: number;
  scoreDelta: number;
  dimensions: Array<{
    id: GhostScoreDimensionId;
    label: string;
    baseline: number;
    rescan: number;
    delta: number;
  }>;
  resolved: LeakDiffItem[];
  persistent: LeakDiffItem[];
  newLeaks: LeakDiffItem[];
  baselineLowConfidence: boolean;
  rescanLowConfidence: boolean;
  verifiedFixIds: string[];
};

function normalizeTitle(title: string) {
  return title.toLowerCase().trim();
}

function leakMatchKey(leak: ConversionLeak) {
  return normalizeTitle(leak.title);
}

function leakFallbackKey(leak: ConversionLeak) {
  return `${leak.category}:${normalizeTitle(leak.title)}`;
}

export function buildRescanComparison(
  baselineReport: GhostReport,
  rescanReport: GhostReport,
  verifiedFixIds: string[] = []
): RescanComparison {
  const matchedBaseline = new Set<string>();
  const matchedRescan = new Set<string>();
  const persistent: LeakDiffItem[] = [];

  for (const rescanLeak of rescanReport.leaks) {
    const titleKey = leakMatchKey(rescanLeak);
    const baselineLeak = baselineReport.leaks.find(
      (l) => leakMatchKey(l) === titleKey
    );
    if (baselineLeak) {
      matchedBaseline.add(leakMatchKey(baselineLeak));
      matchedRescan.add(titleKey);
      persistent.push({ ...baselineLeak, matchKey: titleKey });
      continue;
    }

    const fallbackKey = leakFallbackKey(rescanLeak);
    const fallbackBaseline = baselineReport.leaks.find(
      (l) => leakFallbackKey(l) === fallbackKey && !matchedBaseline.has(leakMatchKey(l))
    );
    if (fallbackBaseline) {
      const mk = leakMatchKey(fallbackBaseline);
      matchedBaseline.add(mk);
      matchedRescan.add(titleKey);
      persistent.push({ ...fallbackBaseline, matchKey: mk });
    }
  }

  const resolved: LeakDiffItem[] = baselineReport.leaks
    .filter((leak) => !matchedBaseline.has(leakMatchKey(leak)))
    .map((leak) => ({ ...leak, matchKey: leakMatchKey(leak) }));

  const newLeaks: LeakDiffItem[] = rescanReport.leaks
    .filter((leak) => !matchedRescan.has(leakMatchKey(leak)))
    .map((leak) => ({ ...leak, matchKey: leakMatchKey(leak) }));

  const dimensions: RescanComparison["dimensions"] = [];
  const baselineDims = baselineReport.scoreBreakdown?.dimensions ?? [];
  const rescanDims = rescanReport.scoreBreakdown?.dimensions ?? [];
  const dimMap = new Map(rescanDims.map((d) => [d.id, d]));

  for (const base of baselineDims) {
    const current = dimMap.get(base.id);
    if (!current) continue;
    dimensions.push({
      id: base.id,
      label: base.label,
      baseline: base.value,
      rescan: current.value,
      delta: current.value - base.value,
    });
  }

  const baselineScore = baselineReport.score;
  const rescanScore = rescanReport.score;

  return {
    baselineMissionId: baselineReport.id,
    rescanMissionId: rescanReport.id,
    baselineScore,
    rescanScore,
    scoreDelta: rescanScore - baselineScore,
    dimensions,
    resolved,
    persistent,
    newLeaks,
    baselineLowConfidence: Boolean(baselineReport.lowConfidence),
    rescanLowConfidence: Boolean(rescanReport.lowConfidence),
    verifiedFixIds,
  };
}

export async function findRescanPairsForUser(userId: string): Promise<RescanPair[]> {
  const rescanMissions = await db.mission.findMany({
    where: {
      userId,
      status: "complete",
      auditType: "rescan",
    },
    select: {
      id: true,
      siteId: true,
      domain: true,
      createdAt: true,
      baselineMissionId: true,
      report: true,
      site: { select: { canonicalDomain: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (rescanMissions.length === 0) return [];

  type BaselineRow = { id: string; siteId: string | null; createdAt: Date; report: unknown };
  const baselineById = new Map<string, BaselineRow>();

  const knownBaselineIds = [
    ...new Set(
      rescanMissions
        .map((r) => r.baselineMissionId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (knownBaselineIds.length > 0) {
    const known = await db.mission.findMany({
      where: { id: { in: knownBaselineIds } },
      select: { id: true, siteId: true, createdAt: true, report: true },
    });
    for (const b of known) baselineById.set(b.id, b);
  }

  const needingFallback = rescanMissions.filter(
    (r) => !r.baselineMissionId && r.siteId,
  );
  const fallbackSiteIds = [
    ...new Set(needingFallback.map((r) => r.siteId!).filter(Boolean)),
  ];

  let fallbackCandidates: BaselineRow[] = [];
  if (fallbackSiteIds.length > 0) {
    fallbackCandidates = await db.mission.findMany({
      where: {
        userId,
        siteId: { in: fallbackSiteIds },
        status: "complete",
        auditType: { not: "rescan" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, siteId: true, createdAt: true, report: true },
    });
  }

  function resolveFallbackBaseline(
    siteId: string,
    before: Date,
  ): BaselineRow | undefined {
    return fallbackCandidates.find(
      (c) => c.siteId === siteId && c.createdAt < before,
    );
  }

  const pairs: RescanPair[] = [];

  for (const rescan of rescanMissions) {
    if (!rescan.siteId) continue;

    let baseline: BaselineRow | undefined;
    if (rescan.baselineMissionId) {
      baseline = baselineById.get(rescan.baselineMissionId);
    } else {
      baseline = resolveFallbackBaseline(rescan.siteId, rescan.createdAt);
    }
    if (!baseline) continue;

    const baselineReport = baseline.report as unknown as GhostReport | null;
    const rescanReport = rescan.report as unknown as GhostReport | null;

    pairs.push({
      siteId: rescan.siteId,
      siteDomain: rescan.site?.canonicalDomain ?? rescan.domain,
      baselineMissionId: baseline.id,
      rescanMissionId: rescan.id,
      baselineCreatedAt: baseline.createdAt,
      rescanCreatedAt: rescan.createdAt,
      baselineScore: baselineReport?.score ?? null,
      rescanScore: rescanReport?.score ?? null,
    });
  }

  return pairs;
}

export async function getComparisonNavVisible(userId: string): Promise<boolean> {
  if (await isUserApproved(userId)) return true;

  const entitlements = await getAccountEntitlements(userId);
  const hasRescanEntitlement = entitlements.some(
    (e) =>
      e.planId === PLAN_IDS.deep999 &&
      e.rescansRemaining > 0 &&
      e.rescansExpiresAt &&
      e.rescansExpiresAt > new Date()
  );
  if (hasRescanEntitlement) return true;

  // Full Intelligence owners — market comparison is a primary product surface.
  if (entitlements.some((e) => e.planId === PLAN_IDS.deep999)) return true;

  const pairs = await findRescanPairsForUser(userId);
  return pairs.length > 0;
}

export async function getComparisonForUser(input: {
  userId: string;
  baselineMissionId?: string;
  rescanMissionId?: string;
}) {
  const pairs = await findRescanPairsForUser(input.userId);

  let baselineId = input.baselineMissionId;
  let rescanId = input.rescanMissionId;

  if (!baselineId || !rescanId) {
    const latest = pairs[0];
    if (!latest) return null;
    baselineId = latest.baselineMissionId;
    rescanId = latest.rescanMissionId;
  }

  const [baselineMission, rescanMission] = await Promise.all([
    db.mission.findFirst({
      where: { id: baselineId, userId: input.userId, status: "complete" },
      select: {
        id: true,
        createdAt: true,
        auditType: true,
        domain: true,
        siteId: true,
        report: true,
        competitorIntelligence: true,
      },
    }),
    db.mission.findFirst({
      where: { id: rescanId, userId: input.userId, status: "complete", auditType: "rescan" },
      select: {
        id: true,
        createdAt: true,
        auditType: true,
        domain: true,
        siteId: true,
        report: true,
      },
    }),
  ]);

  if (!baselineMission?.report || !rescanMission?.report) return null;

  const verifiedFixes = await db.fixStatus.findMany({
    where: {
      userId: input.userId,
      verifiedByMissionId: rescanMission.id,
      status: "verified",
    },
    select: { id: true, title: true },
  });

  const comparison = buildRescanComparison(
    baselineMission.report as unknown as GhostReport,
    rescanMission.report as unknown as GhostReport,
    verifiedFixes.map((f) => f.id)
  );

  const entitlements = await getAccountEntitlements(input.userId);
  const hasDeepEntitlement = entitlements.some((e) => e.planId === PLAN_IDS.deep999);

  let marketIntelligenceMissionId: string | null = null;
  let competitorIntelligence = null;

  if (hasDeepEntitlement) {
    const deepMission =
      baselineMission.auditType === "deep" && baselineMission.competitorIntelligence
        ? baselineMission
        : await findLatestDeepMissionWithIntelligence({
            userId: input.userId,
            siteId: rescanMission.siteId ?? undefined,
            domain: rescanMission.domain,
          });

    if (deepMission?.competitorIntelligence) {
      marketIntelligenceMissionId = deepMission.id;
      competitorIntelligence = parseCompetitorIntelligence(deepMission.competitorIntelligence);
    }
  }

  return {
    pairs,
    comparison,
    verifiedFixes,
    competitorIntelligence,
    marketIntelligenceMissionId,
    baselineMission: {
      id: baselineMission.id,
      createdAt: baselineMission.createdAt,
      auditType: baselineMission.auditType,
      domain: baselineMission.domain,
    },
    rescanMission: {
      id: rescanMission.id,
      createdAt: rescanMission.createdAt,
      auditType: rescanMission.auditType,
      domain: rescanMission.domain,
    },
  };
}

export type MarketIntelSiteOption = {
  siteId: string | null;
  domain: string;
  missionId: string;
  createdAt: Date;
  hasIntel: boolean;
  intelStatus: string | null;
};

/** Distinct sites with a completed Full Intelligence audit. Latest mission first. */
export async function listSitesWithMarketIntelligence(
  userId: string,
): Promise<MarketIntelSiteOption[]> {
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      domain: string;
      siteId: string | null;
      createdAt: Date;
      hasIntel: boolean;
      intelStatus: string | null;
    }>
  >`
    SELECT DISTINCT ON (COALESCE(m."siteId", 'domain:' || lower(m.domain)))
      m.id,
      m.domain,
      m."siteId" AS "siteId",
      m."createdAt" AS "createdAt",
      (m."competitorIntelligence" IS NOT NULL) AS "hasIntel",
      m.progress->>'intelStatus' AS "intelStatus"
    FROM "Mission" m
    WHERE m."userId" = ${userId}
      AND m.status = 'complete'
      AND m."auditType" = 'deep'
    ORDER BY COALESCE(m."siteId", 'domain:' || lower(m.domain)), m."createdAt" DESC`;

  return rows
    .map((m) => ({
      siteId: m.siteId,
      domain: m.domain,
      missionId: m.id,
      createdAt: m.createdAt,
      hasIntel: Boolean(m.hasIntel),
      intelStatus: m.intelStatus ?? null,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getMarketIntelligenceForUser(
  userId: string,
  opts?: { siteId?: string; domain?: string },
) {
  const mission = await findLatestDeepMissionWithIntelligence({
    userId,
    siteId: opts?.siteId,
    domain: opts?.domain,
  });
  if (!mission?.competitorIntelligence) return null;
  return {
    missionId: mission.id,
    domain: mission.domain,
    siteId: mission.siteId,
    createdAt: mission.createdAt,
    competitorIntelligence: parseCompetitorIntelligence(mission.competitorIntelligence),
  };
}

export async function findLatestBaselineMission(input: {
  userId: string;
  siteId: string;
}) {
  return db.mission.findFirst({
    where: {
      userId: input.userId,
      siteId: input.siteId,
      status: "complete",
      auditType: { not: "rescan" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, auditType: true, createdAt: true },
  });
}
