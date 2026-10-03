import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import type { TrafficSupplement } from "@/lib/data-sources/ga4/traffic-supplement";
import { ghostSystemWithTraffic, auditMessages, type OwnerContext } from "./prompts";
import { validateAggregation } from "./validate-output";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "./client";
import { MODEL, MAX_TOKENS_REPORT, STRUCTURED_THINKING } from "./config";
import {
  GrowthLeakReportSchema,
  type ContextPack,
  type CustomerFlow,
  type GrowthLeakReport,
  type PersonaJourney,
} from "./types";

/**
 * Stage 3 — aggregation into the Growth Leak Report.
 *
 * Groups simulated obstacles and ranks them by scope, severity and flow importance.
 * Code verifies quotations/counts and marks unavailable revenue estimates explicitly.
 */

const AGGREGATION_SYSTEM = `Cluster the supplied simulated journeys into distinct, page-specific findings.
Only include an obstacle reported by a non-completed journey. Use 1–3 exact verbatim_complaint
strings from those journeys as best_quotes. Do not change quotations or make up testimony.
Rank by affected journeys × severity × flow importance, highest first. Use contiguous ranks from 1.
Set personas_affected to the distinct contributing journeys. Do not count failed/missing runs.
Build the funnel from supplied outcomes; would_have_bought is the legacy field for completed
simulations, and abandoned counts abandoned outcomes only. Hesitant journeys remain separate.
Headline: state the number and main type of potential obstacles. Never assert a percentage of
real customers lost or real revenue lost. AI persona samples are not traffic measurements.
The legacy revenue_estimate must use monthly_low=0 and monthly_high=0 as unavailable sentinels,
currency="INR", and an assumption explaining that real traffic, conversion and order-value data
are required. Do not infer visitors, average ticket size or a revenue range from business type.`;

const TRAFFIC_AGGREGATION = `When verified traffic is supplied, add page views and landing sessions to
severity, affected journeys, persona evidence and flow importance when assessing a finding's scale.
All else equal, a page with more verified traffic generally deserves earlier attention. Do not rank
solely by page views or introduce numerical priority weights. High/low traffic is relative to the
available pages, not an industry benchmark. Missing pages or metrics are unknown, not zero traffic.
Retain page-specific findings and use the supplied affected page URL in page where possible.
Do not claim that a measured percentage of real users experienced the simulated obstacle.
Explain traffic-informed urgency as interpretation, separate from the measured evidence.`;

export async function aggregate(
  contextPack: ContextPack,
  flows: CustomerFlow[],
  journeys: PersonaJourney[],
  owner: OwnerContext = {},
  trafficEvidence?: TrafficSupplement | null,
): Promise<GrowthLeakReport> {
  // One fresh attempt if the model returns nothing parseable or nothing evidence-backed;
  // the journeys are expensive, so a single bad report must not discard the audit.
  for (let attempt = 0; ; attempt++) {
    const response = await parseStructuredWithTimeout("aggregate", (signal) => anthropic().messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS_REPORT,
      thinking: STRUCTURED_THINKING,
      system: ghostSystemWithTraffic("Summarize audit evidence", trafficEvidence ? `${AGGREGATION_SYSTEM}\n\n${TRAFFIC_AGGREGATION}` : AGGREGATION_SYSTEM, Boolean(trafficEvidence)),
      messages: auditMessages(contextPack, "Produce an evidence-grounded report from these simulated journeys.", { flows, journeys }, owner, trafficEvidence),
      output_config: { format: zodOutputFormat(GrowthLeakReportSchema) },
    }, { signal, maxRetries: 0 }));

    try {
      const report = response.parsed_output;
      if (!report) {
        throw new Error(`Aggregation returned no parseable report (stop_reason=${response.stop_reason}).`);
      }
      return validateAggregation(report, journeys);
    } catch (error) {
      if (attempt >= 1) throw error;
      console.warn(JSON.stringify({ event: "aggregate.retry", reason: error instanceof Error ? error.message : String(error) }));
    }
  }
}
