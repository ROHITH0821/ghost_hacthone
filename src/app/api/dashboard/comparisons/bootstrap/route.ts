import { NextRequest, NextResponse } from "next/server";
import {
  getComparisonForUser,
  getMarketIntelligenceForUser,
  listSitesWithMarketIntelligence,
} from "@/lib/db/comparisons";
import {
  findLatestDeepMissionForUser,
  getMissionIntelMeta,
} from "@/lib/db/missions";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";

async function resolveIntelMetaForSite(
  userId: string,
  opts: { siteId?: string | null; domain?: string; missionId?: string },
) {
  const missionId =
    opts.missionId ??
    (
      await findLatestDeepMissionForUser({
        userId,
        siteId: opts.siteId ?? undefined,
        domain: opts.domain,
      })
    )?.id;

  if (!missionId) return null;
  return getMissionIntelMeta(missionId);
}

function siteMatchesKey(
  site: { siteId: string | null; domain: string },
  siteKey: string,
) {
  return site.siteId === siteKey || site.domain === siteKey;
}

export async function GET(request: NextRequest) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const siteKey =
    request.nextUrl.searchParams.get("siteId") ??
    request.nextUrl.searchParams.get("site") ??
    undefined;

  try {
    return await loadBootstrap(auth.userId, siteKey);
  } catch (error) {
    console.error("[comparisons/bootstrap]", error);
    const message =
      error instanceof Error ? error.message : "Could not load comparisons";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function loadBootstrap(userId: string, siteKey?: string) {
  const sites = await listSitesWithMarketIntelligence(userId);

  const siteOptions = sites.map((s) => ({
    siteId: s.siteId,
    domain: s.domain,
    missionId: s.missionId,
    createdAt: s.createdAt.toISOString(),
    hasIntel: s.hasIntel,
    intelStatus: s.intelStatus,
    key: s.siteId ?? s.domain,
  }));

  const requestedSite = siteKey
    ? sites.find((s) => siteMatchesKey(s, siteKey))
    : null;
  const defaultSite = requestedSite ?? sites[0] ?? null;
  const defaultSiteKey = defaultSite
    ? (defaultSite.siteId ?? defaultSite.domain)
    : null;

  const [market, comparisonSeed, fallbackMission] = await Promise.all([
    defaultSite
      ? getMarketIntelligenceForUser(userId, {
          siteId: defaultSite.siteId ?? undefined,
          domain: defaultSite.siteId ? undefined : defaultSite.domain,
        })
      : getMarketIntelligenceForUser(userId),
    getComparisonForUser({ userId }).catch((error) => {
      console.error("[comparisons/bootstrap] comparison load failed:", error);
      return null;
    }),
    defaultSite
      ? null
      : findLatestDeepMissionForUser({ userId }),
  ]);

  const intelMissionId =
    market?.missionId ??
    defaultSite?.missionId ??
    fallbackMission?.id ??
    null;

  const intelMeta = intelMissionId
    ? await getMissionIntelMeta(intelMissionId)
    : await resolveIntelMetaForSite(userId, {
        siteId: defaultSite?.siteId,
        domain: defaultSite?.domain,
      });

  const sitePair = defaultSite
    ? comparisonSeed?.pairs.find(
        (p) =>
          (defaultSite.siteId != null && p.siteId === defaultSite.siteId) ||
          p.siteDomain.toLowerCase() === defaultSite.domain.toLowerCase()
      )
    : comparisonSeed?.pairs[0];

  const data =
    sitePair &&
    (sitePair.baselineMissionId !== comparisonSeed?.baselineMission.id ||
      sitePair.rescanMissionId !== comparisonSeed?.rescanMission.id)
      ? await getComparisonForUser({
          userId,
          baselineMissionId: sitePair.baselineMissionId,
          rescanMissionId: sitePair.rescanMissionId,
        }).catch((error) => {
          console.error("[comparisons/bootstrap] comparison pair load failed:", error);
          return comparisonSeed;
        })
      : sitePair
        ? comparisonSeed
        : null;

  const hasIntel =
    Boolean(market?.competitorIntelligence) || (defaultSite?.hasIntel ?? false);

  const intelFields = {
    marketIntelExpected: intelMeta?.marketIntelExpected ?? false,
    hasCompetitorCrawlPacks: intelMeta?.hasCompetitorCrawlPacks ?? false,
    intelError: intelMeta?.intelError ?? null,
    intelStatus: intelMeta?.intelStatus ?? defaultSite?.intelStatus ?? null,
    hasIntel,
  };

  const initial = data
    ? {
        pairs: data.pairs,
        comparison: data.comparison,
        verifiedFixes: data.verifiedFixes,
        competitorIntelligence:
          market?.competitorIntelligence ?? data.competitorIntelligence ?? null,
        marketIntelligenceMissionId:
          market?.missionId ?? intelMissionId,
        ...intelFields,
        sites: siteOptions,
        selectedSiteKey: defaultSiteKey,
        baselineMission: {
          ...data.baselineMission,
          createdAt: data.baselineMission.createdAt.toISOString(),
        },
        rescanMission: {
          ...data.rescanMission,
          createdAt: data.rescanMission.createdAt.toISOString(),
        },
      }
    : {
        pairs: comparisonSeed?.pairs ?? [],
        comparison: null,
        verifiedFixes: [],
        competitorIntelligence: market?.competitorIntelligence ?? null,
        marketIntelligenceMissionId: market?.missionId ?? intelMissionId,
        ...intelFields,
        sites: siteOptions,
        selectedSiteKey: defaultSiteKey,
      };

  return NextResponse.json({ initial });
}
