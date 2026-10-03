import type { ContextPack, CustomerFlow, PersonaJourney } from "../types";

export const SCORE_VERSION = "2" as const;

export type GhostScoreBand =
  | "Excellent"
  | "Strong"
  | "Good"
  | "NeedsImprovement"
  | "Weak"
  | "Critical";

export type DimensionId =
  | "customer_journey"
  | "trust"
  | "conversion"
  | "ux"
  | "information"
  | "technical";

export interface ScoreCheck {
  id: string;
  label: string;
  points: number;
  passed: boolean;
  evidence?: string;
}

export interface DimensionScore {
  id: DimensionId;
  label: string;
  weight: number; // 0-1
  value: number; // 0-100
  contribution: number; // 0-100 (value * weight, rounded)
  checks: ScoreCheck[];
}

export interface GhostScoreResult {
  version: typeof SCORE_VERSION;
  value: number;
  band: GhostScoreBand;
  dimensions: DimensionScore[];
}

export interface CrawlSignals {
  pageCount: number;
  richPageCount: number;
  screenshotCount: number;
  dynamicRenderCount: number;
  lowConfidence: boolean;
}

export function defaultCrawlSignals(): CrawlSignals {
  return {
    pageCount: 0,
    richPageCount: 0,
    screenshotCount: 0,
    dynamicRenderCount: 0,
    lowConfidence: false,
  };
}

export interface ScoringInput {
  contextPack: ContextPack;
  flows: CustomerFlow[];
  journeys: PersonaJourney[];
  crawlSignals: CrawlSignals;
}

