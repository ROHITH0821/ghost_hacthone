export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Weighted average of criterion scores; equal weights when omitted. */
export function computeFeatureScore(
  criteriaScores: Array<{ score: number; weight?: number }>,
): number {
  if (criteriaScores.length === 0) return 0;
  let totalWeight = 0;
  let weighted = 0;
  for (const item of criteriaScores) {
    const w = item.weight ?? 1;
    totalWeight += w;
    weighted += clampScore(item.score) * w;
  }
  if (totalWeight === 0) return 0;
  return clampScore(weighted / totalWeight);
}

export function scoreFromCriteriaDefinitions(
  criterionScores: Array<{ criterionId: string; score: number }>,
  definitions: Array<{ id: string; weight?: number }>,
): number {
  const byId = new Map(criterionScores.map((c) => [c.criterionId, c.score]));
  return computeFeatureScore(
    definitions.map((def) => ({
      score: byId.get(def.id) ?? 0,
      weight: def.weight,
    })),
  );
}

export function criterionMeetsThreshold(score: number, threshold = 50): boolean {
  return clampScore(score) >= threshold;
}

export function buildFeatureSummary(
  criteria: Array<{ label: string; score: number }>,
): string {
  if (criteria.length === 0) return "No criteria scored";
  const sorted = [...criteria].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  if (top.score >= 70 && bottom.score < 40) {
    return `Strong on ${top.label.toLowerCase()}; weak on ${bottom.label.toLowerCase()}`;
  }
  if (top.score >= 70) {
    return `Strong ${top.label.toLowerCase()}`;
  }
  if (bottom.score < 40) {
    return `Missing or weak ${bottom.label.toLowerCase()}`;
  }
  return `Moderate across ${sorted.length} signals`;
}

export function scoreToStatus(score: number): "present" | "partial" | "absent" {
  const s = clampScore(score);
  if (s >= 70) return "present";
  if (s >= 35) return "partial";
  return "absent";
}
