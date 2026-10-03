import { ghostSystem, auditMessages, type OwnerContext } from "./prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "./client";
import { MODEL, MAX_TOKENS_PERSONA, STRUCTURED_THINKING, SWARM_CONCURRENCY } from "./config";
import { mapWithConcurrency, parseStructuredWithTimeout } from "./util";
import { archetypeById, type Archetype } from "./archetypes";
import {
  PersonaJourneySchema,
  type ContextPack,
  type CustomerFlow,
  type PersonaJourney,
} from "./types";

/**
 * Stage 2 — the persona swarm, flow-driven and concurrency-bounded.
 *
 * One real LLM call per FLOW: the flow's best-fit archetype (identity) is paired
 * with the flow's concrete goal, and that persona walks the Context Pack. Swarm
 * size therefore equals the number of flows discovered in Stage 1.5.
 *
 * Two cost/robustness measures:
 *  - The anti-generic rules + Context Pack are byte-identical for every shopper
 *    in a run. A cache_control user evidence block permits reuse within the
 *    provider TTL when the model's minimum cache size is reached.
 *  - Calls run through a bounded pool (SWARM_CONCURRENCY) rather than all at
 *    once, so an uncapped flow count can't spike rate limits.
 *
 * THE ANTI-GENERIC RULE is enforced hard. "Add prices" is a failing output.
 * "Your Services page lists 11 services and prices only 3 — I wanted bridal" passes.
 */

const ANTI_GENERIC_RULES = `Simulate the supplied customer persona pursuing the supplied flow.
Evaluate the accessible content; this is not an executed browser session.
For each step name a supplied page and exact CTA, offering or observed obstacle.
Only use counts explicitly supported by the evidence. Do not invent competing businesses,
prices, elapsed seconds, purchases or messages to make a complaint sound vivid.
A completed outcome means the available information supports the goal, not that a transaction occurred.
Use hesitant when a necessary step cannot be verified; abandoned only when the supplied evidence
supports a likely blocker for this persona. A quote request can be appropriate for custom work.
Severity: 1 = minor friction, 3 = meaningful hesitation, 5 = plausible blocker.
The verbatim_complaint is an AI-generated perspective, never a real customer quotation.
Describe the exact unresolved need concisely. If the journey is clear, say so; do not force a complaint.`;

/** A resolved (flow + archetype) pairing that a single swarm shopper runs. */
export interface FlowRun {
  flow: CustomerFlow;
  archetype: Archetype;
}

/** Pair each flow with its archetype identity, ready to run. */
export function buildFlowRuns(flows: CustomerFlow[]): FlowRun[] {
  return flows.map((flow) => {
    const archetype =
      archetypeById.get(flow.archetype_id) ?? archetypeById.get("generic_shopper")!;
    return { flow, archetype };
  });
}

async function runFlow(run: FlowRun, contextPack: ContextPack, owner: OwnerContext): Promise<PersonaJourney> {
  const { flow, archetype } = run;
  const response = await parseStructuredWithTimeout(
    `Persona run for flow ${flow.id}`,
    (signal) => anthropic().messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS_PERSONA,
      thinking: STRUCTURED_THINKING,
      system: ghostSystem("Simulate one customer journey", ANTI_GENERIC_RULES),
      messages: auditMessages(contextPack, "Evaluate this flow from the supplied persona's perspective. Echo the canonical persona and flow IDs.", { flow, persona:archetype }, owner),
      output_config: { format: zodOutputFormat(PersonaJourneySchema) },
    }, { signal, maxRetries: 0 }),
  );

  const journey = response.parsed_output;
  if (!journey) {
    throw new Error(
      `Flow ${flow.id} returned no parseable journey (stop_reason=${response.stop_reason})`,
    );
  }
  // Force ids to our canonical values regardless of what the model echoed.
  return { ...journey, persona: archetype.id, flow_id: flow.id };
}

/**
 * Run one persona per flow through a bounded pool. `onReport` fires as each one
 * lands, so persisted progress can appear in the polling UI. A single shopper failing does not kill the swarm.
 */
export async function runSwarm(
  contextPack: ContextPack,
  runs: FlowRun[],
  onReport?: (journey: PersonaJourney, run: FlowRun) => void | Promise<void>,
  owner: OwnerContext = {},
): Promise<PersonaJourney[]> {

  const settled = await mapWithConcurrency(runs, SWARM_CONCURRENCY, async (run) => {
    const journey = await runFlow(run, contextPack, owner);
    await onReport?.(journey, run);
    return journey;
  });

  const journeys: PersonaJourney[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      journeys.push(result.value);
    } else {
      console.error(
        `  ⚠ flow ${runs[i].flow.id} failed: ${String(result.reason).slice(0, 120)}`,
      );
    }
  });
  return journeys;
}
