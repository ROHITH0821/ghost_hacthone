import { z } from "zod/v4";

/**
 * The contract between all four GHOST stages.
 *
 * Stage 1 (Ingest) PRODUCES a ContextPack.
 * Stage 1.5 (Flow Analysis) consumes it and PRODUCES the CustomerFlows.
 * Stage 2 (Swarm) runs one persona per flow and PRODUCES a PersonaJourney each.
 * Stage 3 (Aggregate) consumes flows + journeys and PRODUCES a GrowthLeakReport.
 *
 * Everything is a zod schema so the boundaries can be validated at runtime — the
 * Context Pack in particular, since a real crawler/vision step will one day feed
 * it and we want malformed packs to fail loudly here, not deep in a prompt.
 */

// ---------------------------------------------------------------------------
// Stage 1 output — Context Pack (structured description of a business's
// online presence, as a customer would experience it)
// ---------------------------------------------------------------------------

export const ContextPackPageSchema = z.object({
  url: z.string(),
  title: z.string(),
  summary: z.string(),
  prices_visible: z.string(), // e.g. "none", "partial — 3 of 9", "all"
  ctas: z.array(z.string()),
  visual_notes: z.string(), // what a human SEES, not just the HTML
});

export const ContextPackSchema = z.object({
  business: z.object({
    name: z.string(),
    type: z.string(), // "salon", "cafe", "boutique", ...
    location: z.string(),
  }),
  pages: z.array(ContextPackPageSchema).min(1),
  nav_structure: z.array(z.string()),
  contact_paths: z.array(z.string()),
  search: z.object({ exists: z.boolean(), notes: z.string().optional() }),
  reviews: z.object({ visible: z.boolean(), notes: z.string().optional() }),
  trust_signals: z.array(z.string()),
});

export type ContextPackPage = z.infer<typeof ContextPackPageSchema>;
export type ContextPack = z.infer<typeof ContextPackSchema>;

// ---------------------------------------------------------------------------
// Stage 1.5 output — the customer flows this business must support
//
// Flow analysis reads the Context Pack and returns exactly the distinct,
// high-value customer journeys relevant to THIS business (no fixed count). The
// number of flows drives the number of personas in the swarm (one per flow).
// ---------------------------------------------------------------------------

export const CustomerFlowSchema = z.object({
  id: z
    .string()
    .describe("snake_case flow id, e.g. discover_service_price, book_for_date"),
  name: z.string().describe("Human-readable flow name"),
  goal: z
    .string()
    .describe(
      "The concrete thing a customer is trying to do in this flow, grounded in THIS specific business",
    ),
  archetype_id: z
    .string()
    .describe("Id of the best-fit shopper archetype from the provided library"),
  revenue_weight: z
    .number()
    .int().min(1).max(5)
    .describe("1 (nice-to-have) to 5 (most of this business's money rides here)"),
  rationale: z.string().describe("Why this flow matters for THIS business"),
});

export type CustomerFlow = z.infer<typeof CustomerFlowSchema>;

export const FlowSetSchema = z.object({
  flows: z.array(CustomerFlowSchema).max(100),
});

// ---------------------------------------------------------------------------
// Stage 2 output — one journey per flow (persona = archetype driving that flow)
// ---------------------------------------------------------------------------

export const JourneyStepSchema = z.object({
  page: z.string().describe("The page/section the customer was on"),
  action: z.string().describe("What the customer did"),
  observation: z
    .string()
    .describe("What they saw — must reference actual page names/buttons/gaps"),
});

export const PersonaJourneySchema = z.object({
  persona: z.string().describe("Archetype id driving this flow"),
  flow_id: z.string().describe("Id of the customer flow this customer was exercising"),
  journey: z.array(JourneyStepSchema),
  outcome: z.enum(["completed", "abandoned", "hesitant"]),
  dropped_at: z
    .string()
    .describe("Page where they gave up, or 'none' if they completed"),
  leak_category: z
    .string()
    .describe(
      "snake_case category, e.g. pricing_opacity, slow_response, no_trust_signals, bad_bio, no_faq, confusing_nav",
    ),
  severity: z
    .number()
    .int().min(1).max(5)
    .describe("1 (minor friction) to 5 (definitely lost the customer)"),
  verbatim_complaint: z
    .string()
    .describe(
      "The customer's own words. MUST quote specific things they saw on THIS site.",
    ),
});

export type PersonaJourney = z.infer<typeof PersonaJourneySchema>;

// ---------------------------------------------------------------------------
// Stage 3 output — the Growth Leak Report
// ---------------------------------------------------------------------------

export const LeakSchema = z.object({
  rank: z.number().int().min(1),
  category: z.string(),
  page: z.string().describe("Where the leak happens"),
  personas_affected: z.number().int().min(1),
  severity_avg: z.number().min(1).max(5).describe("Average severity of this leak, 1-5"),
  best_quotes: z
    .array(z.string())
    .describe("1-3 verbatim customer complaints that best illustrate this leak"),
  why_it_matters: z.string(),
});

export const GrowthLeakReportSchema = z.object({
  business_name: z.string(),
  headline: z
    .string()
    .describe(
      "A concise summary of potential friction in simulated journeys; never claim measured customer loss.",
    ),
  funnel: z.object({
    total_shoppers: z.number().int(),
    would_have_bought: z.number().int(),
    abandoned: z.number().int(),
  }),
  leaks: z.array(LeakSchema),
  revenue_estimate: z.object({
    monthly_low: z.number().int(),
    monthly_high: z.number().int(),
    currency: z.string(),
    assumptions: z
      .array(z.string())
      .describe("Unavailable unless real traffic and order-value data were supplied"),
  }),
});

export type GrowthLeakReport = z.infer<typeof GrowthLeakReportSchema>;

// ---------------------------------------------------------------------------
// Stage 4 output — ready-to-paste fixes, one per top leak
// ---------------------------------------------------------------------------

export const FixTypeSchema = z.enum([
  "price_card", // a postable price list for services customers couldn't price
  "whatsapp_autoreply", // auto-reply / quick-reply script
  "review_request", // message asking happy customers for a review
  "bio_rewrite", // rewritten IG bio / Google Business description (3 variants)
  "faq", // answers to the customers' actual unanswered questions
  "winback_offer", // message to win back customers who left
  "trust_block", // "about / why choose us" block adding address + proof
  "other",
]);

export type FixType = z.infer<typeof FixTypeSchema>;

export const FixSchema = z.object({
  leak_rank: z.number().int().describe("Which leak (by rank) this fix addresses"),
  addresses: z.string().describe("Short name of the leak this plugs"),
  fix_type: FixTypeSchema,
  title: z.string().describe("Short label for the fix"),
  rationale: z.string().describe("One line: how this plugs the leak"),
  usage_hint: z
    .string()
    .describe(
      "Exactly where/how the owner uses it, e.g. 'Post as your WhatsApp status' or 'Paste as your Instagram bio'",
    ),
  variants: z
    .array(z.string())
    .describe(
      "1-3 copy-paste-ready pieces. Use 3 only for bio/description rewrites; otherwise 1.",
    ),
});

export type Fix = z.infer<typeof FixSchema>;
