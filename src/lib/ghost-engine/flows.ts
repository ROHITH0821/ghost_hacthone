import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import { ghostSystem, auditMessages, type OwnerContext } from "./prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "./client";
import { FLOW_MODEL, MAX_TOKENS_FLOWS, STRUCTURED_THINKING } from "./config";
import { archetypeById, archetypeMenu } from "./archetypes";
import { FlowSetSchema, type ContextPack, type CustomerFlow } from "./types";

/**
 * Stage 1.5 — platform analysis → customer flows.
 *
 * One cheap LLM call reads the Context Pack and returns exactly the distinct,
 * high-value customer journeys THIS business must support — as many or as few as
 * the business genuinely warrants. There is no target number; the count falls
 * out of the business's real structure via a distinctness test, and it drives
 * the size of the swarm (one persona per flow).
 */

const FLOW_SYSTEM = `
You analyze a small business's online presence and identify the distinct, high-value
CUSTOMER FLOWS it must support — the journeys real customers take that lead to money,
and where they could realistically drop off.

You are given the business's Context Pack (its pages, prices visible, contact/booking
paths, trust signals) and a LIBRARY OF SHOPPER ARCHETYPES.

There is NO fixed target number of flows. Return exactly the flows this business genuinely
warrants — no more, no less, with a hard maximum of 100. Use this DISTINCTNESS TEST to
decide granularity:

- Two customer journeys are the SAME flow if a customer would drop off at the same place,
  for the same reason, needing the same thing from the site. MERGE them into one flow.
  (e.g. "find the price of bridal makeup" and "find the price of keratin" are ONE flow —
  "discover a high-value service price" — because both fail the same way: "Contact for quote".)
- Two journeys are DIFFERENT flows if they fail at a different point, for a different
  reason, or need a different thing. SPLIT them.
  (e.g. "book via the contact form" vs "reach a human by phone/WhatsApp" are DIFFERENT —
  different failure, different need.)

Rules:
1. Include a flow ONLY if a real customer segment depends on it AND there is a realistic
   point where they could drop off. Do not pad with flows nobody depends on, and do not
   include a flow with no plausible failure point.
2. Do NOT split by service or product when the journey and its failure are identical —
   that just multiplies cost without adding coverage.
3. Tailor flows to the business TYPE and what its pages actually offer. Don't invent a
   flow the business obviously wouldn't have (e.g. no corporate-bulk flow for a solo home
   baker, no "find location" flow for a purely online service).
4. For each flow: give it a snake_case id and a clear name; write a CONCRETE goal grounded
   in this specific business (name the actual service/page where you can); pick the single
   best-fit archetype_id from the library; assign a revenue_weight (1-5) reflecting how much
   of this business's money rides on the flow; and give a one-line rationale.
5. archetype_id MUST be one of the ids in the library. If nothing fits, use generic_shopper.
6. Order flows by revenue_weight, highest first.

ARCHETYPE LIBRARY (pick archetype_id from these):
${archetypeMenu}
`.trim();

export async function analyzeFlows(contextPack: ContextPack, owner: OwnerContext = {}): Promise<CustomerFlow[]> {
  const response = await parseStructuredWithTimeout("flows", (signal) => anthropic().messages.parse({
    model: FLOW_MODEL,
    max_tokens: MAX_TOKENS_FLOWS,
    thinking: STRUCTURED_THINKING,
    system: ghostSystem("Identify customer journeys", FLOW_SYSTEM),
    messages: auditMessages(contextPack, "Identify distinct journeys supported by this business; prioritize the owner goal when provided. Do not require missing features for irrelevant business models.", {}, owner),
    output_config: { format: zodOutputFormat(FlowSetSchema) },
  }, { signal, maxRetries: 0 }));

  const parsed = response.parsed_output;
  if (!parsed || parsed.flows.length === 0) {
    throw new Error(
      `Flow analysis returned no flows (stop_reason=${response.stop_reason}).`,
    );
  }

  // Snap unknown archetype ids to the generic fallback, and drop duplicate flow
  // ids so the swarm always resolves a clean, distinct set.
  const seen = new Set<string>();
  const flows: CustomerFlow[] = [];
  for (const flow of parsed.flows) {
    if (seen.has(flow.id)) continue;
    seen.add(flow.id);
    flows.push({
      ...flow,
      archetype_id: archetypeById.has(flow.archetype_id)
        ? flow.archetype_id
        : "generic_shopper",
    });
  }
  return flows;
}
