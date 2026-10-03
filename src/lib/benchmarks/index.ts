/**
 * Industry benchmark data — disabled until a defensible dataset exists.
 * Requires: min sample size per businessType, dimension aggregates, no cross-industry averaging.
 */

export type IndustryBenchmarkResult = null;

export function industryBenchmarksEnabled(): boolean {
  return process.env.INDUSTRY_BENCHMARKS_ENABLED === "true";
}

export async function getIndustryBenchmark(_input: {
  businessType?: string;
  dimensionId?: string;
}): Promise<IndustryBenchmarkResult> {
  if (!industryBenchmarksEnabled()) return null;
  // Future: query aggregated audit scores by industry tag
  return null;
}
