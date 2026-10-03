import type { AuditConfigSnapshot } from "@/lib/audit-config/types";
import type { ContextPack } from "@/lib/ghost-engine/types";
import type { GhostReport } from "@/lib/types";

import { crawlCompetitors } from "./persist-crawl-pack";
import {
  buildCompetitorIntelligence,
  ownerPagesFromContextPack,
  type IntelligenceBuildInput,
} from "./regenerate-intelligence";
import { rankCompetitors } from "./rank";
import { discoverCompetitorCandidates } from "./search";
import type {
  CompetitorCandidate,
  CompetitorCrawlPack,
  CompetitorIntelligence,
} from "./types";

export interface CompetitorPipelineEvents {
  onProgress?: (message: string) => void;
}

export interface CompetitorPipelineInput {
  missionId: string;
  ownerUrl: string;
  ownerDomain: string;
  ownerContextPack: ContextPack;
  ownerReport: GhostReport;
  auditConfigSnapshot?: AuditConfigSnapshot | null;
  events?: CompetitorPipelineEvents;
}

export interface CompetitorPipelineResult {
  candidates: CompetitorCandidate[];
  crawlPacks: CompetitorCrawlPack[];
  intelligence: CompetitorIntelligence;
}

function log(events: CompetitorPipelineEvents | undefined, message: string) {
  events?.onProgress?.(message);
}

/** Full pipeline: discover → rank → crawl → persist packs → derive intelligence. */
export async function runCompetitorIntelligencePipeline(
  input: CompetitorPipelineInput,
): Promise<CompetitorPipelineResult> {
  const hints = input.auditConfigSnapshot?.competitorHints?.value;
  const limitations: string[] = [];

  log(input.events, "Discovering relevant competitors…");
  const discovery = await discoverCompetitorCandidates({
    ownerDomain: input.ownerDomain,
    contextPack: input.ownerContextPack,
    competitorHints: hints,
  });
  limitations.push(...discovery.limitations);

  if (discovery.candidates.length === 0) {
    limitations.push("No competitor candidates found — add hints or configure web search");
  }

  log(input.events, "Ranking competitor set…");
  const ranked = await rankCompetitors({
    ownerDomain: input.ownerDomain,
    contextPack: input.ownerContextPack,
    candidates: discovery.candidates,
  });

  if (ranked.length === 0) {
    limitations.push("No suitable competitors after ranking");
    const intelligence = await buildCompetitorIntelligence({
      missionId: input.missionId,
      ownerUrl: input.ownerUrl,
      ownerContextPack: input.ownerContextPack,
      ownerReport: input.ownerReport,
      ownerPages: ownerPagesFromContextPack(input.ownerContextPack, input.ownerUrl),
      crawlPacks: [],
      searchMeta: {
        queries: discovery.queries,
        sourcesUsed: discovery.sourcesUsed,
      },
      limitations,
    });
    return { candidates: discovery.candidates, crawlPacks: [], intelligence };
  }

  log(input.events, `Crawling ${ranked.length} competitor site(s)…`);
  const crawlPacks = await crawlCompetitors({
    missionId: input.missionId,
    candidates: ranked,
  });

  for (const pack of crawlPacks) {
    limitations.push(...pack.limitations.map((l) => `${pack.name}: ${l}`));
  }

  log(input.events, "Extracting features and market gaps…");
  const intelligence = await buildCompetitorIntelligence({
    missionId: input.missionId,
    ownerUrl: input.ownerUrl,
    ownerContextPack: input.ownerContextPack,
    ownerReport: input.ownerReport,
    ownerPages: ownerPagesFromContextPack(input.ownerContextPack, input.ownerUrl),
    crawlPacks,
    searchMeta: {
      queries: discovery.queries,
      sourcesUsed: discovery.sourcesUsed,
    },
    limitations,
  });

  return {
    candidates: discovery.candidates,
    crawlPacks,
    intelligence,
  };
}

/** Regenerate intelligence from cached crawl packs (no search/crawl). */
export async function regenerateIntelligenceFromCache(input: {
  missionId: string;
  ownerUrl: string;
  ownerContextPack: ContextPack;
  ownerReport: GhostReport;
  crawlPacks: CompetitorCrawlPack[];
  searchMeta?: { queries: string[]; sourcesUsed: string[] };
  /** Prefer real crawled owner pages when available. */
  ownerPages?: IntelligenceBuildInput["ownerPages"];
}): Promise<CompetitorIntelligence> {
  return buildCompetitorIntelligence({
    missionId: input.missionId,
    ownerUrl: input.ownerUrl,
    ownerContextPack: input.ownerContextPack,
    ownerReport: input.ownerReport,
    ownerPages:
      input.ownerPages ??
      ownerPagesFromContextPack(input.ownerContextPack, input.ownerUrl),
    crawlPacks: input.crawlPacks,
    searchMeta: input.searchMeta ?? { queries: [], sourcesUsed: ["cached_crawl"] },
    limitations: [],
  });
}
