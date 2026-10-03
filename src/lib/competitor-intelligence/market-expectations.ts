import { FEATURE_TAXONOMY } from "./feature-taxonomy";
import {
  CRITERION_OWNER_WEAK,
  CRITERION_PRESENT_THRESHOLD,
  CRITERION_PREVALENCE_THRESHOLD,
} from "./config";
import { clampScore, criterionMeetsThreshold } from "./score-utils";
import type {
  CriterionExpectation,
  FeatureScore,
  MarketExpectation,
  MarketExpectations,
  NormalizedSiteFeatures,
} from "./types";

/** Aggregate competitor features into market expectations (avg scores + criterion prevalence). */
export function buildMarketExpectations(
  competitorFeatures: NormalizedSiteFeatures[],
): MarketExpectations {
  const competitorCount = competitorFeatures.length;
  const expectations: MarketExpectation[] = [];

  for (const def of FEATURE_TAXONOMY) {
    const featureScores: number[] = [];
    const criterionAgg = def.criteria.map((cDef) => ({
      cDef,
      scores: [] as number[],
      presentCount: 0,
      evidenceSnippets: [] as string[],
    }));

    for (const site of competitorFeatures) {
      const f = site.features[def.id];
      if (!f) continue;
      featureScores.push(f.score);

      for (const bucket of criterionAgg) {
        const c = f.criteria.find((x) => x.criterionId === bucket.cDef.id);
        if (!c) continue;
        bucket.scores.push(c.score);
        if (criterionMeetsThreshold(c.score, CRITERION_PRESENT_THRESHOLD)) {
          bucket.presentCount += 1;
          if (c.evidence) bucket.evidenceSnippets.push(c.evidence.slice(0, 100));
        }
      }
    }

    const marketScore =
      featureScores.length > 0
        ? clampScore(featureScores.reduce((a, b) => a + b, 0) / featureScores.length)
        : 0;

    const criteria: CriterionExpectation[] = criterionAgg.map((bucket) => {
      const marketCriterionScore =
        bucket.scores.length > 0
          ? clampScore(bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length)
          : 0;
      const prevalence =
        competitorCount > 0 ? bucket.presentCount / competitorCount : 0;
      const sample = bucket.evidenceSnippets[0] ?? "Not commonly observed";
      return {
        criterionId: bucket.cDef.id,
        label: bucket.cDef.label,
        marketScore: marketCriterionScore,
        prevalence,
        marketEvidence:
          bucket.presentCount > 0
            ? `${bucket.presentCount} of ${competitorCount} show ${bucket.cDef.label.toLowerCase()} (${sample})`
            : `Rare: ${bucket.cDef.label.toLowerCase()}`,
      };
    });

    const strongCriteria = criteria.filter((c) => c.prevalence >= CRITERION_PREVALENCE_THRESHOLD);
    const marketEvidence =
      featureScores.length > 0
        ? `Market avg ${marketScore}/100 for ${def.label.toLowerCase()}${strongCriteria.length ? `; common: ${strongCriteria.map((c) => c.label.toLowerCase()).join(", ")}` : ""}`
        : `No competitor data for ${def.label.toLowerCase()}`;

    expectations.push({
      featureId: def.id,
      marketScore,
      competitorCount: featureScores.length,
      criteria,
      marketEvidence,
    });
  }

  return { competitorCount, expectations };
}

export function getMarketExpectation(
  expectations: MarketExpectations,
  featureId: string,
): MarketExpectation | undefined {
  return expectations.expectations.find((e) => e.featureId === featureId);
}

export function ownerFeatureScore(
  features: NormalizedSiteFeatures,
  featureId: string,
): number {
  return features.features[featureId]?.score ?? 0;
}

export function marketFeatureScore(expectation: MarketExpectation | undefined): number {
  return expectation?.marketScore ?? 0;
}

export function findMissingCriteria(
  ownerFeature: FeatureScore | undefined,
  expectation: MarketExpectation,
): string[] {
  const missing: string[] = [];
  for (const cExp of expectation.criteria) {
    if (cExp.prevalence < CRITERION_PREVALENCE_THRESHOLD) continue;
    const ownerCriterion = ownerFeature?.criteria.find(
      (c) => c.criterionId === cExp.criterionId,
    );
    const ownerScore = ownerCriterion?.score ?? 0;
    if (ownerScore < CRITERION_OWNER_WEAK) {
      missing.push(cExp.label);
    }
  }
  return missing;
}

export function featurePrevalence(expectation: MarketExpectation): number {
  const withSignal = expectation.criteria.filter(
    (c) => c.prevalence >= CRITERION_PREVALENCE_THRESHOLD,
  ).length;
  if (expectation.criteria.length === 0) return 0;
  return withSignal / expectation.criteria.length;
}
