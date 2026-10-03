/**
 * Re-score mission-mska4w7x: crawl owner pages, rebuild intel with LLM theme scores.
 *
 * Usage: npx tsx --env-file=.env.local scripts/backfill-mission-mska4w7x.ts
 */
import { crawlSite } from "../src/lib/ghost-engine/ingest";
import { contextPackFromReport } from "../src/lib/competitor-intelligence/context-from-report";
import {
  COMPETITOR_PAGES_PER_SITE,
  CRAWL_PACK_TEXT_EXCERPT,
} from "../src/lib/competitor-intelligence/config";
import { regenerateIntelligenceFromCache } from "../src/lib/competitor-intelligence/pipeline";
import { parseCompetitorCrawlPacks } from "../src/lib/competitor-intelligence/types";
import {
  activateRescanWindowOnDeepAudit,
  bindEntitlementToUrl,
  getUnboundEntitlements,
} from "../src/lib/db/entitlements";
import { seedFixStatusesFromReport } from "../src/lib/db/fix-status";
import { persistCompetitorIntelligence } from "../src/lib/db/missions";
import { db } from "../src/lib/db";
import { PLAN_IDS } from "../src/lib/plans";
import type { GhostReport } from "../src/lib/types";

const MISSION_ID = "mission-mska4w7x";
const DOMAIN = "mivanawellness.com";

async function crawlOwnerPages(url: string) {
  console.log("Crawling owner site…", url);
  const crawl = await crawlSite(url, {
    maxPages: Math.min(8, COMPETITOR_PAGES_PER_SITE),
    screenshotTopK: 0,
    useCache: false,
  });
  return crawl.pages
    .filter((p) => p.title || p.text)
    .map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription,
      textExcerpt: p.text.replace(/\s+/g, " ").trim().slice(0, CRAWL_PACK_TEXT_EXCERPT),
    }));
}

async function main() {
  const mission = await db.mission.findUnique({
    where: { id: MISSION_ID },
    select: {
      id: true,
      userId: true,
      siteId: true,
      domain: true,
      url: true,
      auditType: true,
      status: true,
      report: true,
      competitorCrawlPacks: true,
      competitorIntelligence: true,
    },
  });

  if (!mission?.userId || !mission.report || mission.status !== "complete") {
    throw new Error(`Mission ${MISSION_ID} missing, incomplete, or has no report`);
  }
  if (!mission.siteId) {
    throw new Error(`Mission ${MISSION_ID} has no siteId`);
  }

  const userId = mission.userId;
  const report = mission.report as unknown as GhostReport;

  let deepEnt = await db.entitlement.findFirst({
    where: {
      userId,
      planId: PLAN_IDS.deep999,
      status: "active",
      OR: [{ siteId: mission.siteId }, { boundUrl: { contains: DOMAIN } }],
    },
  });

  if (!deepEnt) {
    const unbound = (await getUnboundEntitlements(userId, PLAN_IDS.deep999))[0];
    if (!unbound) throw new Error("No unbound deep_999 entitlement to bind");
    deepEnt = await bindEntitlementToUrl({
      entitlementId: unbound.id,
      userId,
      url: mission.url || `https://${DOMAIN}`,
    });
    console.log("Bound deep_999", deepEnt.id, "→", DOMAIN);
  } else {
    console.log("deep_999 already bound", deepEnt.id);
  }

  await activateRescanWindowOnDeepAudit({ userId, domain: DOMAIN });
  await seedFixStatusesFromReport({
    userId,
    siteId: mission.siteId,
    missionId: MISSION_ID,
    domain: mission.domain,
    report,
  });
  const fixCount = await db.fixStatus.count({ where: { missionId: MISSION_ID } });
  console.log("FixStatus rows for mission:", fixCount);

  const crawlPacks = parseCompetitorCrawlPacks(mission.competitorCrawlPacks);
  if (crawlPacks.length === 0) {
    throw new Error("No competitor crawl packs — cannot rebuild theme scores");
  }

  let ownerPages = await crawlOwnerPages(mission.url);
  if (ownerPages.length === 0) {
    console.warn("Owner crawl empty — falling back to report context pack pages");
    const pack = contextPackFromReport(report);
    ownerPages = pack.pages.map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: "",
      textExcerpt: `${p.summary} CTAs: ${p.ctas.join(", ")}. ${p.visual_notes}`.slice(
        0,
        CRAWL_PACK_TEXT_EXCERPT,
      ),
    }));
  } else {
    console.log("Owner pages crawled:", ownerPages.length);
  }

  const existing = mission.competitorIntelligence as
    | { search_strategy?: { queries?: string[]; sourcesUsed?: string[] } }
    | null;

  console.log("Rebuilding competitor intelligence with LLM theme scores…");
  const intelligence = await regenerateIntelligenceFromCache({
    missionId: MISSION_ID,
    ownerUrl: mission.url,
    ownerContextPack: contextPackFromReport(report),
    ownerReport: report,
    crawlPacks,
    searchMeta: {
      queries: existing?.search_strategy?.queries ?? [],
      sourcesUsed: existing?.search_strategy?.sourcesUsed ?? ["cached_crawl", "theme_rescore"],
    },
    ownerPages,
  });

  await persistCompetitorIntelligence(MISSION_ID, intelligence);

  const ownerObserved =
    intelligence.owner_theme_scores?.themes.filter((t) => t.status === "observed").length ?? 0;
  console.log("Owner observed themes:", ownerObserved, "/", 7);
  for (const site of intelligence.competitor_theme_scores ?? []) {
    const n = site.themes.filter((t) => t.status === "observed").length;
    console.log(`  ${site.siteName}: ${n}/7 observed`);
  }
  console.log("market_gaps:", intelligence.market_gaps.length);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
