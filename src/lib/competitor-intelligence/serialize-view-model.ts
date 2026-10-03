import { buildMarketComparisonViewModel } from "./comparison-view-model";
import type { CompetitorIntelligence } from "./types";

/** Serialize the canonical view model for API clients (no React derivation). */
export function serializeMarketComparisonViewModel(
  intelligence: CompetitorIntelligence,
) {
  return buildMarketComparisonViewModel(intelligence);
}
