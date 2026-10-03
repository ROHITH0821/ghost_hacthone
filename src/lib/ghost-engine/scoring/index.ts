import type { ContextPack, CustomerFlow, PersonaJourney } from "../types";
import type { CrawlSignals, DimensionScore, GhostScoreResult, ScoringInput } from "./types";
import { SCORE_VERSION, defaultCrawlSignals } from "./types";
import { scoreBand } from "./bands";
import { scoreCustomerJourney } from "./journey";
import { scoreTrust } from "./trust";
import { scoreConversion } from "./conversion";
import { scoreUx } from "./ux";
import { scoreInformation } from "./information";
import { scoreTechnical } from "./technical";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function sumContribution(dimensions: DimensionScore[]): number {
  return dimensions.reduce((s, d) => s + d.contribution, 0);
}

export function computeGhostScoreV2(input: ScoringInput): GhostScoreResult {
  const crawlSignals = input.crawlSignals ?? defaultCrawlSignals();

  const dimensions: DimensionScore[] = [
    scoreCustomerJourney({ flows: input.flows, journeys: input.journeys }),
    scoreTrust(input.contextPack),
    scoreConversion(input.contextPack),
    scoreUx(input.contextPack),
    scoreInformation(input.contextPack),
    scoreTechnical(crawlSignals),
  ].map((d) => ({
    ...d,
    // Recompute contribution to avoid drift if any scorer forgot.
    contribution: Math.round(d.value * d.weight),
  }));

  const value = clamp(Math.round(sumContribution(dimensions)), 0, 100);
  const band = scoreBand(value);

  return { version: SCORE_VERSION, value, band, dimensions };
}

// Backward compatible type aliases (used by other modules).
export type { GhostScoreResult as GhostScore } from "./types";
export type { GhostScoreBand } from "./types";
export type { DimensionScore, ScoreCheck } from "./types";
export type { CrawlSignals } from "./types";
export { defaultCrawlSignals };

// Convenience overload to keep call sites tidy.
export function computeGhostScoreV2FromParts(args: {
  contextPack: ContextPack;
  flows: CustomerFlow[];
  journeys: PersonaJourney[];
  crawlSignals?: CrawlSignals;
}): GhostScoreResult {
  return computeGhostScoreV2({
    contextPack: args.contextPack,
    flows: args.flows,
    journeys: args.journeys,
    crawlSignals: args.crawlSignals ?? defaultCrawlSignals(),
  });
}

