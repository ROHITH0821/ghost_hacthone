import type { ContextPack } from "@/lib/ghost-engine/types";
import type { GhostReport } from "@/lib/types";
import { mapWithConcurrency } from "@/lib/ghost-engine/util";

import {
  evidenceHighlightsFromFeatures,
  extractFeaturesFromCrawlPack,
  extractSiteFeatures,
  qualityScoreFromFeatures,
  topFeatureScoresFromFeatures,
  topStrengthsFromFeatures,
  weaknessesFromFeatures,
} from "./extract-features";
import { generateMarketGaps } from "./gap-analysis";
import { buildMarketExpectations } from "./market-expectations";
import {
  computeExtractCoverage,
  crawlQualityFromFeatures,
} from "./crawl-quality";
import { scoreThemesFromPages, type SiteThemeScores } from "./score-themes";
import type {
  CompetitorCrawlPack,
  CompetitorIntelligence,
  CompetitorSummary,
  NormalizedSiteFeatures,
} from "./types";
import { INTELLIGENCE_VERSION, CompetitorIntelligenceSchema } from "./types";
import { TAXONOMY_VERSION } from "./feature-taxonomy";

const FEATURE_EXTRACT_CONCURRENCY = 3;
const THEME_SCORE_CONCURRENCY = 3;

export interface IntelligenceBuildInput {
  missionId: string;
  ownerUrl: string;
  ownerContextPack: ContextPack;
  ownerReport: GhostReport;
  ownerPages: Array<{
    url: string;
    title: string;
    metaDescription: string;
    textExcerpt: string;
  }>;
  crawlPacks: CompetitorCrawlPack[];
  searchMeta: {
    queries: string[];
    sourcesUsed: string[];
  };
  limitations?: string[];
}

function buildCompetitorSummaries(
  crawlPacks: CompetitorCrawlPack[],
  competitorFeatures: NormalizedSiteFeatures[],
): CompetitorSummary[] {
  const byUrl = new Map(competitorFeatures.map((f) => [f.siteUrl, f]));
  const summaries: CompetitorSummary[] = [];

  for (const pack of crawlPacks) {
    const features = byUrl.get(pack.canonicalUrl);
    if (!features) continue;
    summaries.push({
      crawlPackId: pack.id,
      name: pack.name,
      canonicalUrl: pack.canonicalUrl,
      relevanceScore: pack.relevanceScore,
      qualityScore: qualityScoreFromFeatures(features),
      topStrengths: topStrengthsFromFeatures(features),
      weaknesses: weaknessesFromFeatures(features),
      evidenceHighlights: evidenceHighlightsFromFeatures(features),
      topFeatureScores: topFeatureScoresFromFeatures(features),
      selectionReason:
        pack.selectionReason || "Selected as a relevant market comparator",
      crawlQuality: crawlQualityFromFeatures(features, pack),
    });
  }

  return summaries;
}

function pushExtractLimitations(
  limitations: string[],
  label: string,
  features: NormalizedSiteFeatures,
): void {
  const cov = computeExtractCoverage(features);
  if (!cov.lowConfidence) return;
  limitations.push(
    `${label}: feature extract found almost no usable page evidence (${cov.knownCount}/${cov.totalFeatures} features with criterion evidence) — recommend a deeper crawl or higher GHOST_COMPETITOR_PAGES budget; regenerate alone will not fix thin packs`,
  );
}

/** Derive CompetitorIntelligence from cached crawl packs + owner report (no re-crawl). */
export async function buildCompetitorIntelligence(
  input: IntelligenceBuildInput,
): Promise<CompetitorIntelligence> {
  const limitations = [...(input.limitations ?? [])];

  const ownerFeatures = await extractSiteFeatures({
    siteUrl: input.ownerUrl,
    siteName: input.ownerContextPack.business.name,
    pages: input.ownerPages,
  });
  pushExtractLimitations(limitations, "Your site", ownerFeatures);

  const competitorFeatures: NormalizedSiteFeatures[] = [];
  const settled = await mapWithConcurrency(
    input.crawlPacks,
    FEATURE_EXTRACT_CONCURRENCY,
    (pack) => extractFeaturesFromCrawlPack(pack),
  );
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const pack = input.crawlPacks[i];
    if (result.status === "fulfilled") {
      competitorFeatures.push(result.value);
      pushExtractLimitations(limitations, pack.name, result.value);
    } else {
      limitations.push(`Feature extraction failed for ${pack.name}`);
    }
  }

  const thinPacks = input.crawlPacks.filter((p) => {
    const cov = p.coverage?.proxyCoverage;
    if (cov != null) return cov < 0.5;
    return p.pages.length < 3;
  });
  if (thinPacks.length > 0) {
    limitations.push(
      `Thin crawl coverage for ${thinPacks.map((p) => p.name).join(", ")} — regenerate reuses cached pages; run a new Deep audit after raising crawl budget if scores stay empty`,
    );
  }

  if (competitorFeatures.length === 0) {
    limitations.push("No competitor features extracted — market comparison unavailable");
  }

  const market_expectations = buildMarketExpectations(competitorFeatures);
  const market_gaps =
    competitorFeatures.length > 0
      ? await generateMarketGaps({
          ownerFeatures,
          competitorFeatures,
          ownerReport: input.ownerReport,
        })
      : [];

  const competitorSummaries = buildCompetitorSummaries(
    input.crawlPacks,
    competitorFeatures,
  );

  const ownerThemeScores = await scoreThemesFromPages({
    siteUrl: input.ownerUrl,
    siteName: input.ownerContextPack.business.name,
    pages: input.ownerPages,
  });
  const observedOwnerThemes = ownerThemeScores.themes.filter(
    (t) => t.status === "observed",
  ).length;
  if (observedOwnerThemes === 0) {
    limitations.push(
      "Your site: theme scoring found no observed themes — crawl may be too thin; re-run with richer owner pages",
    );
  }

  const competitorThemeScores: SiteThemeScores[] = [];
  const themeSettled = await mapWithConcurrency(
    input.crawlPacks,
    THEME_SCORE_CONCURRENCY,
    (pack) =>
      scoreThemesFromPages({
        siteUrl: pack.canonicalUrl,
        siteName: pack.name,
        pages: pack.pages,
      }),
  );
  for (let i = 0; i < themeSettled.length; i++) {
    const result = themeSettled[i];
    const pack = input.crawlPacks[i];
    if (result.status === "fulfilled") {
      competitorThemeScores.push(result.value);
      const observed = result.value.themes.filter((t) => t.status === "observed").length;
      if (observed === 0) {
        limitations.push(
          `${pack.name}: theme scoring found no observed themes — page text may be thin or blocked`,
        );
      }
    } else {
      limitations.push(`Theme scoring failed for ${pack.name}`);
    }
  }

  const intelligence: CompetitorIntelligence = {
    missionId: input.missionId,
    intelligenceVersion: INTELLIGENCE_VERSION,
    generatedAt: new Date().toISOString(),
    taxonomyVersion: TAXONOMY_VERSION,
    market_definition: {
      category: input.ownerContextPack.business.type,
      geography: input.ownerContextPack.business.location,
      buyerGoal: input.ownerReport.businessUnderstanding.primaryGoal ?? "Evaluate and purchase",
    },
    search_strategy: {
      queries: input.searchMeta.queries,
      sourcesUsed: input.searchMeta.sourcesUsed,
    },
    competitorSummaries,
    owner_features: ownerFeatures,
    competitor_features: competitorFeatures,
    owner_theme_scores: ownerThemeScores,
    competitor_theme_scores: competitorThemeScores,
    market_expectations,
    market_gaps,
    limitations,
  };

  return CompetitorIntelligenceSchema.parse(intelligence);
}

export function ownerPagesFromContextPack(
  contextPack: ContextPack,
  ownerUrl: string,
): IntelligenceBuildInput["ownerPages"] {
  if (contextPack.pages.length > 0) {
    return contextPack.pages.map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: "",
      textExcerpt: `${p.summary} CTAs: ${p.ctas.join(", ")}. ${p.visual_notes}`.slice(0, 2500),
    }));
  }
  return [
    {
      url: ownerUrl,
      title: contextPack.business.name,
      metaDescription: "",
      textExcerpt: JSON.stringify(contextPack.business),
    },
  ];
}
