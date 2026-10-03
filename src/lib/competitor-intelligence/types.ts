import { z } from "zod/v4";

import type { GhostScoreDimensionId } from "@/lib/types";

import { TAXONOMY_VERSION } from "./feature-taxonomy";

export const INTELLIGENCE_VERSION = "2";
export const CRAWL_PACK_VERSION = "1";

export const CompetitorCrawlPageSchema = z.object({
  url: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  textExcerpt: z.string(),
});

export const CrawlCoverageMetricsSchema = z.object({
  pagesCrawled: z.number().int().min(0),
  richPages: z.number().int().min(0),
  highValuePages: z.number().int().min(0),
  /** 0–1 taxonomy proxy coverage at crawl stop */
  proxyCoverage: z.number().min(0).max(1),
  proxyHits: z.number().int().min(0),
  applicableFeatures: z.number().int().min(0),
  stopReason: z.enum(["coverage", "budget", "queue_exhausted"]),
});

export const CompetitorCrawlPackSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  canonicalUrl: z.string(),
  name: z.string(),
  relevanceScore: z.number().min(0).max(100),
  selectionReason: z.string(),
  crawledAt: z.string(),
  crawlVersion: z.literal(CRAWL_PACK_VERSION),
  pages: z.array(CompetitorCrawlPageSchema).min(1),
  limitations: z.array(z.string()),
  /** Optional — older packs omit this */
  coverage: CrawlCoverageMetricsSchema.optional(),
});

export const CompetitorCandidateSchema = z.object({
  url: z.string(),
  name: z.string(),
  source: z.enum(["search", "hint", "llm"]),
  snippet: z.string().optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  selectionReason: z.string().optional(),
  rejected: z.boolean().optional(),
  rejectReason: z.string().optional(),
});

export const CriterionScoreSchema = z.object({
  criterionId: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["present", "partial", "absent"]),
  evidence: z.string(),
});

export const FeatureScoreSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  sourceUrls: z.array(z.string()).max(5),
  criteria: z.array(CriterionScoreSchema).min(1),
});

export const NormalizedSiteFeaturesSchema = z.object({
  siteUrl: z.string(),
  siteName: z.string(),
  extractedAt: z.string(),
  features: z.record(z.string(), FeatureScoreSchema),
  /** Optional narrative lists from the same extract call (preferred over derivation). */
  highlights: z
    .object({
      topStrengths: z.array(z.string()).max(3),
      weaknesses: z.array(z.string()).max(3),
      evidenceHighlights: z.array(z.string()).max(3),
    })
    .optional(),
});

export const CriterionExpectationSchema = z.object({
  criterionId: z.string(),
  label: z.string(),
  marketScore: z.number().min(0).max(100),
  prevalence: z.number().min(0).max(1),
  marketEvidence: z.string(),
});

export const MarketExpectationSchema = z.object({
  featureId: z.string(),
  marketScore: z.number().min(0).max(100),
  competitorCount: z.number().int().min(0),
  criteria: z.array(CriterionExpectationSchema),
  marketEvidence: z.string(),
});

export const MarketExpectationsSchema = z.object({
  competitorCount: z.number().int().min(0),
  expectations: z.array(MarketExpectationSchema),
});

export const GapTypeSchema = z.enum([
  "missing_expected",
  "weaker_than_market",
  "differentiation_opportunity",
]);

export const GapPrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const MarketGapSchema = z.object({
  gap: z.string().min(3),
  evidence: z.string().min(10),
  impact: z.string().min(10),
  recommendation: z.string().min(10),
  featureId: z.string(),
  dimension: z.custom<GhostScoreDimensionId>(),
  gapType: GapTypeSchema,
  priority: GapPrioritySchema,
  prevalence: z.number().min(0).max(1),
  competitorCount: z.number().int().min(0),
  ownerScore: z.number().min(0).max(100).optional(),
  marketScore: z.number().min(0).max(100).optional(),
  scoreDelta: z.number().optional(),
  missingCriteria: z.array(z.string()).optional(),
  linkedLeakIds: z.array(z.string()).optional(),
});

export const CompetitorSummarySchema = z.object({
  crawlPackId: z.string(),
  name: z.string(),
  canonicalUrl: z.string(),
  relevanceScore: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100),
  topStrengths: z.array(z.string()).max(3),
  weaknesses: z.array(z.string()).max(3),
  evidenceHighlights: z.array(z.string()).max(3),
  selectionReason: z.string().optional(),
  crawlQuality: z.enum(["good", "partial", "weak"]).optional(),
  topFeatureScores: z
    .array(
      z.object({
        featureId: z.string(),
        label: z.string(),
        score: z.number().min(0).max(100),
        topCriterion: z.string().optional(),
      }),
    )
    .max(3)
    .optional(),
});

export const ThemeScoreSchema = z.object({
  themeId: z.string(),
  status: z.enum(["observed", "not_observed"]),
  score: z.number().min(0).max(100).nullable(),
  quote: z.string().nullable(),
  sourceUrl: z.string().optional(),
});

export const SiteThemeScoresSchema = z.object({
  siteUrl: z.string(),
  siteName: z.string(),
  scoredAt: z.string(),
  themes: z.array(ThemeScoreSchema),
});

export const CompetitorIntelligenceSchema = z.object({
  missionId: z.string(),
  intelligenceVersion: z.string(),
  generatedAt: z.string(),
  taxonomyVersion: z.literal(TAXONOMY_VERSION),
  market_definition: z.object({
    category: z.string(),
    geography: z.string(),
    buyerGoal: z.string(),
  }),
  search_strategy: z.object({
    queries: z.array(z.string()),
    sourcesUsed: z.array(z.string()),
  }),
  competitorSummaries: z.array(CompetitorSummarySchema),
  owner_features: NormalizedSiteFeaturesSchema,
  /** Full per-competitor feature maps for side-by-side compare. Optional on older intel. */
  competitor_features: z.array(NormalizedSiteFeaturesSchema).optional(),
  /** LLM theme scores (preferred for You vs cards). Optional on older intel. */
  owner_theme_scores: SiteThemeScoresSchema.optional(),
  competitor_theme_scores: z.array(SiteThemeScoresSchema).optional(),
  market_expectations: MarketExpectationsSchema,
  market_gaps: z.array(MarketGapSchema),
  limitations: z.array(z.string()),
});

export type GapType = z.infer<typeof GapTypeSchema>;
export type GapPriority = z.infer<typeof GapPrioritySchema>;
export type CompetitorCrawlPage = z.infer<typeof CompetitorCrawlPageSchema>;
export type CompetitorCrawlPack = z.infer<typeof CompetitorCrawlPackSchema>;
export type CompetitorCandidate = z.infer<typeof CompetitorCandidateSchema>;
export type CriterionScore = z.infer<typeof CriterionScoreSchema>;
export type FeatureScore = z.infer<typeof FeatureScoreSchema>;
export type NormalizedSiteFeatures = z.infer<typeof NormalizedSiteFeaturesSchema>;
export type CriterionExpectation = z.infer<typeof CriterionExpectationSchema>;
export type MarketExpectation = z.infer<typeof MarketExpectationSchema>;
export type MarketExpectations = z.infer<typeof MarketExpectationsSchema>;
export type MarketGap = z.infer<typeof MarketGapSchema>;
export type CompetitorSummary = z.infer<typeof CompetitorSummarySchema>;
export type ThemeScoreRecord = z.infer<typeof ThemeScoreSchema>;
export type SiteThemeScoresRecord = z.infer<typeof SiteThemeScoresSchema>;
export type CompetitorIntelligence = z.infer<typeof CompetitorIntelligenceSchema>;

export function parseCompetitorIntelligence(raw: unknown): CompetitorIntelligence | null {
  const result = CompetitorIntelligenceSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCompetitorCrawlPacks(raw: unknown): CompetitorCrawlPack[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => CompetitorCrawlPackSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);
}
