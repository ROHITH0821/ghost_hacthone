import {
  CRAWL_QUALITY_GOOD_COVERAGE,
  CRAWL_QUALITY_PARTIAL_COVERAGE,
  EXTRACT_LOW_CONFIDENCE_ABSENT_RATIO,
} from "./config";
import { FEATURE_TAXONOMY } from "./feature-taxonomy";
import type { CompetitorCrawlPack, FeatureScore, NormalizedSiteFeatures } from "./types";

export type CrawlQuality = "good" | "partial" | "weak";

const UNKNOWN_EVIDENCE_PATTERNS = [
  /^not observed/i,
  /^not commonly observed/i,
  /^not found/i,
  /^n\/a$/i,
  /^none$/i,
];

export function isUnknownEvidence(evidence: string | undefined | null): boolean {
  const t = (evidence ?? "").trim();
  if (!t) return true;
  return UNKNOWN_EVIDENCE_PATTERNS.some((re) => re.test(t));
}

/** True when at least one criterion has real crawl evidence (not a filler "Not observed"). */
export function isKnownFeature(f: FeatureScore | undefined | null): boolean {
  if (!f) return false;
  return f.criteria.some((c) => !isUnknownEvidence(c.evidence));
}

export interface ExtractCoverage {
  /** 0–1 share of taxonomy features with known (non-filler) criterion evidence */
  realCoverage: number;
  knownCount: number;
  totalFeatures: number;
  /** Features that are score 0 with only filler evidence */
  absentFillerCount: number;
  lowConfidence: boolean;
}

export function computeExtractCoverage(
  features: NormalizedSiteFeatures | undefined | null,
): ExtractCoverage {
  const totalFeatures = FEATURE_TAXONOMY.length;
  if (!features?.features) {
    return {
      realCoverage: 0,
      knownCount: 0,
      totalFeatures,
      absentFillerCount: totalFeatures,
      lowConfidence: true,
    };
  }

  let knownCount = 0;
  let absentFillerCount = 0;
  for (const def of FEATURE_TAXONOMY) {
    const f = features.features[def.id];
    if (isKnownFeature(f)) {
      knownCount += 1;
    } else if (
      !f ||
      (f.score === 0 &&
        f.criteria.every((c) => isUnknownEvidence(c.evidence)))
    ) {
      absentFillerCount += 1;
    }
  }

  const realCoverage = totalFeatures > 0 ? knownCount / totalFeatures : 0;
  const lowConfidence =
    totalFeatures > 0 &&
    absentFillerCount / totalFeatures >= EXTRACT_LOW_CONFIDENCE_ABSENT_RATIO;

  return {
    realCoverage,
    knownCount,
    totalFeatures,
    absentFillerCount,
    lowConfidence,
  };
}

export function crawlQualityFromCoverage(realCoverage: number): CrawlQuality {
  if (realCoverage >= CRAWL_QUALITY_GOOD_COVERAGE) return "good";
  if (realCoverage >= CRAWL_QUALITY_PARTIAL_COVERAGE) return "partial";
  return "weak";
}

/**
 * Prefer post-extract real coverage. Falls back to pack proxy coverage / rich pages
 * when features are missing (should be rare after intelligence build).
 */
export function crawlQualityFromFeatures(
  features: NormalizedSiteFeatures | undefined | null,
  pack?: CompetitorCrawlPack,
): CrawlQuality {
  if (features) {
    const { realCoverage, lowConfidence } = computeExtractCoverage(features);
    if (lowConfidence) return "weak";
    return crawlQualityFromCoverage(realCoverage);
  }

  return crawlQualityFromPack(pack);
}

/** Pack-only fallback (pre-extract or legacy packs). */
export function crawlQualityFromPack(
  pack: CompetitorCrawlPack | undefined | null,
): CrawlQuality {
  if (!pack) return "weak";
  const lim = pack.limitations.join(" ").toLowerCase();
  const hasLimitedContent =
    lim.includes("limited readable") ||
    lim.includes("blocked") ||
    lim.includes("no content");
  const richPages = pack.pages.filter(
    (p) => p.textExcerpt.replace(/\s+/g, " ").trim().length > 400,
  ).length;

  if (hasLimitedContent || richPages === 0) return "weak";

  if (pack.coverage) {
    return crawlQualityFromCoverage(pack.coverage.proxyCoverage);
  }

  // Legacy packs without coverage metrics
  if (richPages < 3) return "partial";
  return "partial";
}
