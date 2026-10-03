import { crawlSite } from "@/lib/ghost-engine/ingest";
import type { RawPage } from "@/lib/ghost-engine/ingest/extract";

import {
  COMPETITOR_PAGES_PER_SITE,
  CRAWL_PACK_TEXT_EXCERPT,
} from "./config";
import { computeTaxonomyProxyCoverage, type CrawlStopReason } from "./evidence-sufficiency";
import type { CompetitorCandidate, CompetitorCrawlPack, CompetitorCrawlPage } from "./types";
import { CRAWL_PACK_VERSION } from "./types";
import { candidateDisplayName } from "./rank";

function trimPage(page: RawPage): CompetitorCrawlPage {
  const text = page.text.replace(/\s+/g, " ").trim();
  return {
    url: page.url,
    title: page.title,
    metaDescription: page.metaDescription,
    textExcerpt: text.slice(0, CRAWL_PACK_TEXT_EXCERPT),
  };
}

function stopReasonFor(input: {
  truncated: boolean;
  pagesFetched: number;
  maxPages: number;
}): CrawlStopReason {
  if (input.pagesFetched >= input.maxPages || input.truncated) return "budget";
  return "queue_exhausted";
}

export async function crawlCompetitorToPack(input: {
  missionId: string;
  candidate: CompetitorCandidate;
}): Promise<CompetitorCrawlPack> {
  const limitations: string[] = [];
  let pages: CompetitorCrawlPage[] = [];
  let coverage:
    | CompetitorCrawlPack["coverage"]
    | undefined;

  try {
    const crawl = await crawlSite(input.candidate.url, {
      maxPages: COMPETITOR_PAGES_PER_SITE,
      screenshotTopK: 0,
      useCache: true,
    });
    pages = crawl.pages.map(trimPage);
    const proxy = computeTaxonomyProxyCoverage(pages);
    const stopReason = stopReasonFor({
      truncated: Boolean(crawl.truncated),
      pagesFetched: pages.length,
      maxPages: COMPETITOR_PAGES_PER_SITE,
    });
    coverage = {
      pagesCrawled: pages.length,
      richPages: proxy.richPages,
      highValuePages: proxy.highValuePages,
      proxyCoverage: Math.round(proxy.coverage * 1000) / 1000,
      proxyHits: proxy.hitCount,
      applicableFeatures: proxy.applicableCount,
      stopReason,
    };

    const pct = Math.round(proxy.coverage * 100);
    if (stopReason === "budget") {
      limitations.push(
        `Stopped: page budget (${pages.length}/${COMPETITOR_PAGES_PER_SITE}); proxy coverage ${pct}%`,
      );
    } else {
      limitations.push(
        `Stopped: no further high-value URLs; proxy coverage ${pct}%`,
      );
    }

    if (proxy.richPages === 0) {
      limitations.push(
        "Limited readable content — site may block crawlers or rely on heavy JavaScript",
      );
    }
  } catch (error) {
    limitations.push(
      error instanceof Error ? error.message : "Competitor crawl failed",
    );
  }

  if (pages.length === 0) {
    pages = [
      {
        url: input.candidate.url,
        title: candidateDisplayName(input.candidate),
        metaDescription: input.candidate.snippet ?? "",
        textExcerpt: input.candidate.snippet ?? "No content captured",
      },
    ];
    const proxy = computeTaxonomyProxyCoverage(pages);
    coverage = {
      pagesCrawled: pages.length,
      richPages: proxy.richPages,
      highValuePages: proxy.highValuePages,
      proxyCoverage: Math.round(proxy.coverage * 1000) / 1000,
      proxyHits: proxy.hitCount,
      applicableFeatures: proxy.applicableCount,
      stopReason: "queue_exhausted",
    };
  }

  return {
    id: `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    missionId: input.missionId,
    canonicalUrl: input.candidate.url,
    name: candidateDisplayName(input.candidate),
    relevanceScore: input.candidate.relevanceScore ?? 60,
    selectionReason:
      input.candidate.selectionReason ?? "Selected as a relevant market comparator",
    crawledAt: new Date().toISOString(),
    crawlVersion: CRAWL_PACK_VERSION,
    pages,
    limitations,
    coverage,
  };
}

export async function crawlCompetitors(input: {
  missionId: string;
  candidates: CompetitorCandidate[];
}): Promise<CompetitorCrawlPack[]> {
  const packs: CompetitorCrawlPack[] = [];
  for (const candidate of input.candidates) {
    packs.push(await crawlCompetitorToPack({ missionId: input.missionId, candidate }));
  }
  return packs;
}
