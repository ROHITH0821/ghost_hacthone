import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getComparisonForUser,
  getMarketIntelligenceForUser,
  listSitesWithMarketIntelligence,
} from "@/lib/db/comparisons";
import { findLatestDeepMissionForUser, getMissionIntelMeta } from "@/lib/db/missions";
import { serializeMarketComparisonViewModel } from "@/lib/competitor-intelligence/serialize-view-model";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { PRIVATE_SHORT } from "@/lib/http/cache-headers";

function serializeSites(
  sites: Awaited<ReturnType<typeof listSitesWithMarketIntelligence>>,
) {
  return sites.map((s) => ({
    siteId: s.siteId,
    domain: s.domain,
    missionId: s.missionId,
    createdAt: s.createdAt.toISOString(),
    hasIntel: s.hasIntel,
    intelStatus: s.intelStatus,
    /** Stable picker value: prefer siteId, else domain. */
    key: s.siteId ?? s.domain,
  }));
}

function siteMatchesKey(
  site: { siteId: string | null; domain: string },
  siteKey: string,
) {
  return site.siteId === siteKey || site.domain === siteKey;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const params = request.nextUrl.searchParams;
  const baselineMissionId = params.get("baselineMissionId") ?? undefined;
  const rescanMissionId = params.get("rescanMissionId") ?? undefined;
  const marketOnly = params.get("market") === "1";
  const siteKey = params.get("siteId") ?? params.get("site") ?? undefined;

  const sites = await listSitesWithMarketIntelligence(userId);
  const serializedSites = serializeSites(sites);

  if (marketOnly) {
    const selected =
      (siteKey
        ? sites.find((s) => siteMatchesKey(s, siteKey))
        : null) ?? sites[0] ?? null;

    const market = selected
      ? await getMarketIntelligenceForUser(userId, {
          siteId: selected.siteId ?? undefined,
          domain: selected.siteId ? undefined : selected.domain,
        })
      : await getMarketIntelligenceForUser(userId);

    const fallbackMission =
      market?.missionId == null && selected
        ? await findLatestDeepMissionForUser({
            userId,
            siteId: selected.siteId ?? undefined,
            domain: selected.siteId ? undefined : selected.domain,
          })
        : market?.missionId == null
          ? await findLatestDeepMissionForUser({ userId })
          : null;

    const intelMissionId = market?.missionId ?? fallbackMission?.id ?? null;
    const intelMeta = intelMissionId
      ? await getMissionIntelMeta(intelMissionId)
      : null;

    return NextResponse.json(
      {
        sites: serializedSites,
        selectedSiteKey: selected
          ? selected.siteId ?? selected.domain
          : null,
        marketIntelligence: market
          ? {
              missionId: market.missionId,
              domain: market.domain,
              siteId: market.siteId,
              createdAt: market.createdAt.toISOString(),
              competitorIntelligence: market.competitorIntelligence,
              marketComparison: market.competitorIntelligence
                ? serializeMarketComparisonViewModel(market.competitorIntelligence)
                : null,
              marketIntelExpected: false,
              hasCompetitorCrawlPacks: intelMeta?.hasCompetitorCrawlPacks ?? true,
              intelError: intelMeta?.intelError ?? null,
              intelStatus: intelMeta?.intelStatus ?? "complete",
              hasIntel: true,
            }
          : intelMeta
            ? {
                missionId: intelMissionId,
                domain: fallbackMission?.domain ?? selected?.domain ?? null,
                siteId: fallbackMission?.siteId ?? selected?.siteId ?? null,
                createdAt: fallbackMission?.createdAt.toISOString() ?? null,
                competitorIntelligence: null,
                marketComparison: null,
                marketIntelExpected: intelMeta.marketIntelExpected,
                hasCompetitorCrawlPacks: intelMeta.hasCompetitorCrawlPacks,
                intelError: intelMeta.intelError,
                intelStatus: intelMeta.intelStatus,
                hasIntel: false,
              }
            : null,
      },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  }

  const data = await getComparisonForUser({
    userId,
    baselineMissionId,
    rescanMissionId,
  });

  if (!data) {
    return NextResponse.json(
      {
        pairs: [],
        comparison: null,
        sites: serializedSites,
      },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  }

  return NextResponse.json(
    {
      ...data,
      sites: serializedSites,
    },
    { headers: { "Cache-Control": PRIVATE_SHORT } }
  );
}
