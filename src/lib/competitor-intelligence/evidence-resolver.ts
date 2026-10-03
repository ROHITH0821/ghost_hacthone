import { FEATURE_BY_ID } from "./feature-taxonomy";
import { isKnownFeature, isUnknownEvidence } from "./crawl-quality";
import type {
  CompetitorIntelligence,
  CompetitorSummary,
  FeatureScore,
  NormalizedSiteFeatures,
} from "./types";

export type ResolvedEvidenceStatus =
  | "verified"
  | "summarized"
  | "inferred"
  | "score_only"
  | "not_observed"
  | "not_crawled";

export type ResolvedEvidenceSource =
  | "criterion"
  | "highlight"
  | "summary"
  | "narrative"
  | "score";

export interface ResolvedEvidence {
  status: ResolvedEvidenceStatus;
  confidence: number;
  source: ResolvedEvidenceSource;
  score?: number;
  quote?: string;
  sourceUrl?: string;
  explanation?: string;
}

export interface NarrativeContext {
  evidenceHighlights?: string[];
  topStrengths?: string[];
  weaknesses?: string[];
}

const CONFIDENCE = {
  criterion: 0.9,
  highlight: 0.7,
  summary: 0.6,
  narrative: 0.5,
  score: 0.35,
  none: 0,
} as const;

export function hasRenderableEvidence(e: ResolvedEvidence): boolean {
  return e.status !== "not_observed" && e.status !== "not_crawled";
}

function matchNarrativeBullet(
  bullets: string[] | undefined,
  featureId: string,
  featureLabel: string,
): string | undefined {
  if (!bullets?.length) return undefined;
  const label = featureLabel.toLowerCase();
  const id = featureId.toLowerCase().replace(/_/g, " ");
  return bullets.find((b) => {
    const t = b.toLowerCase();
    return t.includes(label) || t.includes(id) || label.split(/\s+/).some((w) => w.length > 3 && t.includes(w));
  });
}

/**
 * Resolve one feature into a single evidence object using the priority chain.
 * Later sources (OCR, Lighthouse, etc.) can be inserted into this list.
 */
export function resolveFeatureEvidence(
  feature: FeatureScore | undefined,
  featureId: string,
  narrative: NarrativeContext = {},
): ResolvedEvidence {
  const def = FEATURE_BY_ID.get(featureId);
  const label = def?.label ?? featureId;

  if (!feature) {
    const narrativeHit =
      matchNarrativeBullet(narrative.evidenceHighlights, featureId, label) ??
      matchNarrativeBullet(narrative.topStrengths, featureId, label) ??
      matchNarrativeBullet(narrative.weaknesses, featureId, label);
    if (narrativeHit) {
      return {
        status: "inferred",
        confidence: CONFIDENCE.narrative,
        source: "narrative",
        quote: narrativeHit.slice(0, 220),
        explanation: "From narrative extraction",
      };
    }
    return {
      status: "not_crawled",
      confidence: CONFIDENCE.none,
      source: "score",
      explanation: "Feature map not available for this site",
    };
  }

  // 1. Criterion evidence
  const ranked = [...feature.criteria].sort((a, b) => b.score - a.score);
  const withEvidence = ranked.find((c) => !isUnknownEvidence(c.evidence));
  if (withEvidence) {
    return {
      status: "verified",
      confidence: CONFIDENCE.criterion,
      source: "criterion",
      score: feature.score,
      quote: withEvidence.evidence.slice(0, 220),
      sourceUrl: feature.sourceUrls[0],
      explanation: withEvidence.label,
    };
  }

  // 2. Evidence highlights
  const highlight = matchNarrativeBullet(
    narrative.evidenceHighlights,
    featureId,
    label,
  );
  if (highlight) {
    return {
      status: "summarized",
      confidence: CONFIDENCE.highlight,
      source: "highlight",
      score: feature.score,
      quote: highlight.slice(0, 220),
      sourceUrl: feature.sourceUrls[0],
    };
  }

  // 3. Feature summary
  const summary = feature.summary?.trim();
  if (
    summary &&
    !isUnknownEvidence(summary) &&
    (isKnownFeature(feature) || feature.score > 0)
  ) {
    return {
      status: "summarized",
      confidence: CONFIDENCE.summary,
      source: "summary",
      score: feature.score,
      quote: summary.slice(0, 220),
      sourceUrl: feature.sourceUrls[0],
    };
  }

  // 4. Narrative strength/weakness
  const narrativeHit =
    matchNarrativeBullet(narrative.topStrengths, featureId, label) ??
    matchNarrativeBullet(narrative.weaknesses, featureId, label);
  if (narrativeHit) {
    return {
      status: "inferred",
      confidence: CONFIDENCE.narrative,
      source: "narrative",
      score: feature.score,
      quote: narrativeHit.slice(0, 220),
      explanation: "From narrative extraction",
    };
  }

  // 5. Score only — never for filler zeros (missing criteria defaulted to 0)
  if (typeof feature.score === "number") {
    if (feature.score === 0 && !isKnownFeature(feature)) {
      return {
        status: "not_observed",
        confidence: CONFIDENCE.none,
        source: "score",
        explanation: "No observed evidence on crawled pages",
      };
    }
    return {
      status: "score_only",
      confidence: CONFIDENCE.score,
      source: "score",
      score: feature.score,
      explanation: "Score available without textual evidence",
    };
  }

  // 6. Unknown
  return {
    status: "not_observed",
    confidence: CONFIDENCE.none,
    source: "score",
    explanation: "No observed evidence on crawled pages",
  };
}

export function narrativeFromSiteFeatures(
  site: NormalizedSiteFeatures | undefined,
): NarrativeContext {
  if (!site?.highlights) return {};
  return {
    evidenceHighlights: site.highlights.evidenceHighlights,
    topStrengths: site.highlights.topStrengths,
    weaknesses: site.highlights.weaknesses,
  };
}

export function narrativeFromSummary(summary: CompetitorSummary): NarrativeContext {
  return {
    evidenceHighlights: summary.evidenceHighlights,
    topStrengths: summary.topStrengths,
    weaknesses: summary.weaknesses,
  };
}

export function resolveOwnerEvidence(
  intelligence: CompetitorIntelligence,
  featureId: string,
): ResolvedEvidence {
  return resolveFeatureEvidence(
    intelligence.owner_features.features[featureId],
    featureId,
    narrativeFromSiteFeatures(intelligence.owner_features),
  );
}

export function resolveCompetitorEvidence(
  intelligence: CompetitorIntelligence,
  competitorUrl: string,
  featureId: string,
): ResolvedEvidence {
  const features =
    intelligence.competitor_features?.find((f) => f.siteUrl === competitorUrl) ??
    null;
  const summary = intelligence.competitorSummaries.find(
    (s) => s.canonicalUrl === competitorUrl,
  );
  const narrative = features
    ? {
        ...narrativeFromSiteFeatures(features),
        ...(summary ? narrativeFromSummary(summary) : {}),
        topStrengths:
          narrativeFromSiteFeatures(features).topStrengths?.length
            ? narrativeFromSiteFeatures(features).topStrengths
            : summary?.topStrengths,
        weaknesses:
          narrativeFromSiteFeatures(features).weaknesses?.length
            ? narrativeFromSiteFeatures(features).weaknesses
            : summary?.weaknesses,
        evidenceHighlights:
          narrativeFromSiteFeatures(features).evidenceHighlights?.length
            ? narrativeFromSiteFeatures(features).evidenceHighlights
            : summary?.evidenceHighlights,
      }
    : summary
      ? narrativeFromSummary(summary)
      : {};

  if (!features && !summary) {
    return {
      status: "not_crawled",
      confidence: 0,
      source: "score",
      explanation: "Competitor not in feature maps",
    };
  }

  return resolveFeatureEvidence(
    features?.features[featureId],
    featureId,
    narrative,
  );
}

/** Site-level narrative bullets with confidence for profile cards. */
export function resolveProfileBullets(
  bullets: string[],
  kind: "strength" | "weakness",
  features: NormalizedSiteFeatures | undefined,
): Array<{ text: string; confidence: number }> {
  if (bullets.length === 0) return [];
  return bullets.slice(0, 3).map((text) => {
    const matchedFeature = FEATURE_BY_ID
      ? [...FEATURE_BY_ID.entries()].find(([, def]) =>
          text.toLowerCase().includes(def.label.toLowerCase()),
        )
      : undefined;
    if (matchedFeature && features) {
      const resolved = resolveFeatureEvidence(
        features.features[matchedFeature[0]],
        matchedFeature[0],
        {
          topStrengths: kind === "strength" ? bullets : undefined,
          weaknesses: kind === "weakness" ? bullets : undefined,
          evidenceHighlights: features.highlights?.evidenceHighlights,
        },
      );
      return {
        text,
        confidence: Math.max(resolved.confidence, CONFIDENCE.narrative),
      };
    }
    return { text, confidence: CONFIDENCE.narrative };
  });
}
