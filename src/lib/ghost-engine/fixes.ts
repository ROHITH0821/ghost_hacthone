import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import { trafficForFinding, type TrafficSupplement } from "@/lib/data-sources/ga4/traffic-supplement";
import { ghostSystemWithTraffic, auditMessages, type OwnerContext } from "./prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "./client";
import { MODEL, MAX_TOKENS_FIX, STRUCTURED_THINKING, SWARM_CONCURRENCY } from "./config";
import { mapWithConcurrency } from "./util";
import {
  FixSchema,
  type ContextPack,
  type Fix,
  type GrowthLeakReport,
} from "./types";

/**
 * Stage 4 — fix generation.
 *
 * One focused LLM call per leak turns a diagnosis into a copy-paste-ready
 * artifact grounded in THIS business: a price card, a WhatsApp auto-reply, a
 * rewritten bio, an FAQ built from the customers' own unanswered questions, etc.
 * The model picks the best fix_type for each leak. Calls run in parallel through
 * the same bounded pool as the swarm.
 */

type Leak = GrowthLeakReport["leaks"][number];

const FIX_SYSTEM = `
You are a practical marketing + operations helper for a non-technical small business owner
in the market identified in the supplied evidence. You are given ONE growth leak found on their online presence,
plus the business's Context Pack. Produce ONE reviewable draft addressing THIS obstacle.

Rules:
1. Pick the single best fix_type for this leak:
   - price_card: a clean, postable price list for the services customers couldn't find prices for.
   - whatsapp_autoreply: an auto-reply / quick-reply script for when customers message.
   - review_request: a short message to send happy customers asking for a Google/Instagram review.
   - bio_rewrite: a rewritten Instagram bio or Google Business description — give exactly 3 variants.
   - faq: answers to the actual questions customers were left asking (use the simulated questions from
     the leak's verbatim quotes).
   - winback_offer: a message to win back customers who left.
   - trust_block: a short "about / why choose us" block that adds address, proof, or credentials.
   - other: only if none of the above fit.
2. NEVER FABRICATE FACTS. This is the most important rule — the owner pastes this onto their live
   site, so an invented claim becomes a public lie. Do NOT invent prices, statistics, metrics
   ("340% growth", "45 leads in 60 days"), review counts, testimonials, star ratings, awards,
   credentials, years in business, team size, addresses, pincodes, phone numbers, or email
   addresses. Use ONLY facts present in the Context Pack. For anything the owner must supply,
   leave an obvious fill-in they complete — "Bridal makeup — [confirmed price and currency]", "[your address]",
   "[X] years in business", "[link to your Google reviews]" — never a plausible-looking fake.
   If the Context Pack shows a real detail (a real phone number, a real service name), copy it
   EXACTLY — do not alter digits or spelling.
3. Copy-paste ready. No markdown scaffolding to clean up. Write in the language the customers
   actually use — plain English unless the owner explicitly requests another language.
4. Do NOT repeat yourself. Each line/section appears exactly once; never restate a block or a line.
5. For faq, answer the specific unanswered questions in the leak's verbatim quotes — not generic ones.
6. usage_hint must tell the owner exactly where to put it (IG bio, WhatsApp status, Google listing,
   the auto-reply setting, etc.).
7. Keep it tight and genuinely usable — the owner reviews this before publication. Set variants to a
   single piece for everything except bio_rewrite (which gets 3). Echo leak_rank from the leak.
`.trim();

async function fixForLeak(contextPack: ContextPack, leak: Leak, owner: OwnerContext, trafficEvidence?: TrafficSupplement | null): Promise<Fix> {
  const pageTraffic = trafficForFinding(trafficEvidence, { page: leak.page, category: leak.category, whatIsWrong: leak.why_it_matters });
  const response = await parseStructuredWithTimeout("fixes", (signal) => anthropic().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS_FIX,
    thinking: STRUCTURED_THINKING,
    system: ghostSystemWithTraffic("Draft a reviewable fix", pageTraffic ? `${FIX_SYSTEM}

Use the supplied page-specific GA4 evidence only to explain urgency in rationale, alongside the
observed obstacle. Traffic is potential reach, not proven affected users, lost customers or lost revenue.
Keep publishable variants grounded in website facts; never insert private traffic statistics into them.
Do not infer site-wide comparisons from this one page. Preserve source/date attribution for numeric claims.` : FIX_SYSTEM, Boolean(pageTraffic)),
    messages: auditMessages(contextPack, "Draft one specific fix. Keep unknown business details in brackets and explain what the owner must verify in usage_hint.", { leak }, owner, pageTraffic),
    output_config: { format: zodOutputFormat(FixSchema) },
  }, { signal, maxRetries: 0 }));

  const fix = response.parsed_output;
  if (!fix) {
    throw new Error(
      `Fix for leak #${leak.rank} returned no parseable artifact (stop_reason=${response.stop_reason})`,
    );
  }
  if (fix.variants.length !== (fix.fix_type === "bio_rewrite" ? 3 : 1)) {
    throw new Error(`Fix for leak #${leak.rank} has an invalid variant count`);
  }
  // Force leak_rank to the real leak regardless of what the model echoed.
  return { ...fix, leak_rank: leak.rank };
}

/**
 * Generate one fix per leak (typically the top-N leaks), in parallel. `onFix`
 * fires as each lands. A single fix failing does not drop the others.
 */
export async function generateFixes(
  contextPack: ContextPack,
  leaks: Leak[],
  onFix?: (fix: Fix) => void | Promise<void>,
  owner: OwnerContext = {},
  trafficEvidence?: TrafficSupplement | null,
): Promise<Fix[]> {
  const settled = await mapWithConcurrency(leaks, SWARM_CONCURRENCY, async (leak) => {
    const fix = await fixForLeak(contextPack, leak, owner, trafficEvidence);
    await onFix?.(fix);
    return fix;
  });

  const fixes: Fix[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      fixes.push(result.value);
    } else {
      console.error(
        `  ⚠ fix for leak #${leaks[i].rank} failed: ${String(result.reason).slice(0, 120)}`,
      );
    }
  });
  // Keep fixes in leak-rank order for stable rendering.
  return fixes.sort((a, b) => a.leak_rank - b.leak_rank);
}
