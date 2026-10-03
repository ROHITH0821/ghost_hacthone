import { timeStage } from "@/lib/missions/execution-context";
import type { TrafficSupplement } from "@/lib/data-sources/ga4/traffic-supplement";
import type { OwnerContext } from "./prompts";
import { analyzeFlows } from "./flows";
import { buildFlowRuns, runSwarm, type FlowRun } from "./swarm";
import { aggregate } from "./aggregate";
import { generateFixes } from "./fixes";
import {
  computeGhostScoreV2FromParts,
  defaultCrawlSignals,
  type GhostScore,
  type CrawlSignals,
} from "./scoring";
import { MAX_FIXES } from "./config";
import {
  ContextPackSchema,
  type ContextPack,
  type CustomerFlow,
  type Fix,
  type GrowthLeakReport,
  type PersonaJourney,
} from "./types";

/**
 * The reusable core: Context Pack → flows → swarm → report → fixes.
 *
 * Presentation-free on purpose. The CLI (index.ts) and, later, an SSE endpoint
 * for the web UI both call this and just render the events + result differently.
 */

export interface AuditProgress {
  done: number;
  total: number;
}

export interface AuditEvents {
  /** Fired once, after Stage 1.5 decides the customer flows. */
  onFlows?: (flows: CustomerFlow[]) => void | Promise<void>;
  /** Fired as each customer finishes, in completion order. */
  onCustomer?: (
    journey: PersonaJourney,
    run: FlowRun,
    progress: AuditProgress,
  ) => void | Promise<void>;
  /** Fired once, when the swarm is done and aggregation begins. */
  onAggregateStart?: (journeys: PersonaJourney[]) => void | Promise<void>;
  /** Fired once, when the Growth Leak Report + Ghost Score are ready (before any fixes). */
  onReport?: (report: GrowthLeakReport, score: GhostScore) => void | Promise<void>;
  /** Fired once, when fix generation begins (with how many will run). */
  onFixesStart?: (count: number) => void | Promise<void>;
  /** Fired as each fix lands. */
  onFix?: (fix: Fix, progress: AuditProgress) => void | Promise<void>;
}

export interface AuditOptions {
  /** Generate Stage-4 fixes as part of the run. Set false to defer to a click. */
  withFixes?: boolean;
  ownerContext?: OwnerContext;
  /** Optional cached reporting facts, used only after independent persona simulation. */
  trafficEvidence?: TrafficSupplement | null;
  /** How many top leaks to fix. Defaults to config MAX_FIXES. */
  maxFixes?: number;
  /** Lightweight deterministic crawl signals for Technical scoring. */
  crawlSignals?: CrawlSignals;
}

export interface AuditResult {
  flows: CustomerFlow[];
  journeys: PersonaJourney[];
  report: GrowthLeakReport;
  score: GhostScore;
  fixes: Fix[];
}

export async function runAudit(
  contextPack: ContextPack,
  events: AuditEvents = {},
  options: AuditOptions = {},
): Promise<AuditResult> {
  const { withFixes = true, maxFixes = MAX_FIXES, crawlSignals, ownerContext = {}, trafficEvidence } = options;

  // Fail loudly on a malformed pack (important once a real crawler feeds this).
  const pack = ContextPackSchema.parse(contextPack);

  // Stage 1.5 — flows drive the swarm size.
  const flows = await timeStage("flow_analysis", () => analyzeFlows(pack, ownerContext));
  await events.onFlows?.(flows);

  // Stage 2 — one independent customer per flow, in parallel.
  const runs = buildFlowRuns(flows);
  let done = 0;
  const journeys = await timeStage("swarm", () => runSwarm(pack, runs, async (journey, run) => {
    done += 1;
    await events.onCustomer?.(journey, run, { done, total: runs.length });
  }, ownerContext));

  if (journeys.length === 0) {
    throw new Error("No customers completed their journey — cannot aggregate.");
  }

  // Stage 3 — cluster into leaks, weighted by flow revenue.
  await events.onAggregateStart?.(journeys);
  const report = await timeStage("aggregation", () => aggregate(pack, flows, journeys, ownerContext, trafficEvidence));
  const score = computeGhostScoreV2FromParts({
    contextPack: pack,
    flows,
    journeys,
    crawlSignals: crawlSignals ?? defaultCrawlSignals(),
  });
  await events.onReport?.(report, score);

  // Stage 4 — turn the worst leaks into ready-to-paste fixes.
  let fixes: Fix[] = [];
  if (withFixes) {
    const topLeaks = [...report.leaks]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, maxFixes);
    if (topLeaks.length > 0) {
      await events.onFixesStart?.(topLeaks.length);
      let fixDone = 0;
      fixes = await timeStage("fix_generation", () => generateFixes(pack, topLeaks, async (fix) => {
        fixDone += 1;
        await events.onFix?.(fix, { done: fixDone, total: topLeaks.length });
      }, ownerContext, trafficEvidence));
    }
  }

  return { flows, journeys, report, score, fixes };
}
