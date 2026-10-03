import type { GhostScoreDimensionId } from "@/lib/types";

import { computeFeatureScore, scoreFromCriteriaDefinitions } from "./score-utils";

export const TAXONOMY_VERSION = "2";

export interface FeatureCriterionDefinition {
  id: string;
  label: string;
  weight?: number;
}

export interface FeatureDefinition {
  id: string;
  label: string;
  dimension: GhostScoreDimensionId;
  description: string;
  criteria: FeatureCriterionDefinition[];
}

/** Normalized feature ids with scored criteria breakdowns (taxonomy v2). */
export const FEATURE_TAXONOMY: FeatureDefinition[] = [
  {
    id: "pricing_transparency",
    label: "Pricing transparency",
    dimension: "conversion",
    description: "Prices or packages visible without contacting sales",
    criteria: [
      { id: "visible_prices", label: "Visible prices" },
      { id: "installments_or_plans", label: "Installments or payment plans" },
      { id: "taxes_fees_explained", label: "Taxes and fees explained" },
      { id: "refund_cancellation_policy", label: "Refund / cancellation policy" },
    ],
  },
  {
    id: "faq_section",
    label: "FAQ section",
    dimension: "information",
    description: "Dedicated FAQ answering common buyer questions",
    criteria: [
      { id: "dedicated_faq_page", label: "Dedicated FAQ section or page" },
      { id: "delivery_timing_answers", label: "Delivery / timing questions answered" },
      { id: "pricing_policy_answers", label: "Pricing and policy questions answered" },
      { id: "easy_to_find", label: "Easy to find from nav or footer" },
    ],
  },
  {
    id: "testimonials",
    label: "Customer testimonials",
    dimension: "trust",
    description: "Named or attributed customer quotes or stories",
    criteria: [
      { id: "named_quotes", label: "Named or attributed quotes" },
      { id: "specific_outcomes", label: "Specific outcomes mentioned" },
      { id: "multiple_testimonials", label: "Multiple testimonials shown" },
      { id: "context_or_photos", label: "Photos or role/context provided" },
    ],
  },
  {
    id: "reviews_social_proof",
    label: "Reviews / ratings",
    dimension: "trust",
    description: "Star ratings, Google reviews, or third-party review embeds",
    criteria: [
      { id: "star_ratings_visible", label: "Star ratings visible" },
      { id: "review_count_shown", label: "Review count or volume shown" },
      { id: "third_party_embed", label: "Third-party review embed" },
      { id: "recent_reviews", label: "Recent reviews highlighted" },
    ],
  },
  {
    id: "case_studies",
    label: "Case studies",
    dimension: "trust",
    description: "Before/after or client outcome stories",
    criteria: [
      { id: "client_named", label: "Client or project named" },
      { id: "before_after_or_results", label: "Before/after or measurable results" },
      { id: "problem_solution_narrative", label: "Problem → solution narrative" },
      { id: "industry_relevance", label: "Relevant to target buyer segment" },
    ],
  },
  {
    id: "accreditations",
    label: "Accreditations / certifications",
    dimension: "trust",
    description: "Industry badges, certifications, or partner logos",
    criteria: [
      { id: "certification_badges", label: "Certification badges displayed" },
      { id: "partner_logos", label: "Partner or association logos" },
      { id: "awards_mentioned", label: "Awards or recognitions mentioned" },
      { id: "verifiable_claims", label: "Claims appear verifiable (named body)" },
    ],
  },
  {
    id: "founder_visibility",
    label: "Founder / team visibility",
    dimension: "trust",
    description: "Photos, bios, or story of the people behind the business",
    criteria: [
      { id: "team_photos", label: "Team or founder photos" },
      { id: "names_and_roles", label: "Names and roles listed" },
      { id: "founder_story", label: "Founder or team story" },
      { id: "contactable_person", label: "Direct contact to a person offered" },
    ],
  },
  {
    id: "contact_multiple_channels",
    label: "Multiple contact channels",
    dimension: "conversion",
    description: "Phone, WhatsApp, email, or chat offered clearly",
    criteria: [
      { id: "phone_visible", label: "Phone number visible" },
      { id: "email_visible", label: "Email visible" },
      { id: "whatsapp_or_messaging", label: "WhatsApp or messaging link" },
      { id: "contact_form", label: "Contact form available" },
    ],
  },
  {
    id: "booking_cta",
    label: "Book / buy CTA",
    dimension: "conversion",
    description: "Primary action to book, buy, or start checkout",
    criteria: [
      { id: "primary_cta_above_fold", label: "Primary CTA above the fold" },
      { id: "action_specific_copy", label: "Action-specific copy (Book, Buy, etc.)" },
      { id: "cta_on_key_pages", label: "CTA repeated on key pages" },
      { id: "low_friction_start", label: "Low-friction start (no forced signup)" },
    ],
  },
  {
    id: "shipping_returns_policy",
    label: "Shipping / returns policy",
    dimension: "information",
    description: "Delivery times, returns, or guarantee terms stated",
    criteria: [
      { id: "delivery_times", label: "Delivery times stated" },
      { id: "return_window", label: "Return window explained" },
      { id: "guarantee_terms", label: "Guarantee or warranty terms" },
      { id: "policy_easy_to_find", label: "Policy easy to find" },
    ],
  },
  {
    id: "about_story",
    label: "About / brand story",
    dimension: "trust",
    description: "Mission, history, or why-we-exist narrative",
    criteria: [
      { id: "mission_or_why", label: "Mission or why-we-exist statement" },
      { id: "history_or_origin", label: "History or origin story" },
      { id: "values_or_promise", label: "Values or brand promise" },
      { id: "differentiation_claim", label: "Clear differentiation claim" },
    ],
  },
  {
    id: "product_detail_depth",
    label: "Product / service detail",
    dimension: "information",
    description: "Specs, inclusions, or scope explained per offering",
    criteria: [
      { id: "inclusions_listed", label: "Inclusions / scope listed" },
      { id: "specs_or_deliverables", label: "Specs or deliverables explained" },
      { id: "comparison_or_tiers", label: "Comparison or tier differences" },
      { id: "per_offering_pages", label: "Dedicated page per major offering" },
    ],
  },
  {
    id: "mobile_friendly_signals",
    label: "Mobile-friendly layout",
    dimension: "ux",
    description: "Readable on mobile; tap targets and nav work on small screens",
    criteria: [
      { id: "readable_text_layout", label: "Readable text and spacing" },
      { id: "nav_accessible", label: "Navigation accessible on small screens" },
      { id: "tap_targets", label: "Buttons and links appear tappable" },
      { id: "no_horizontal_scroll", label: "No obvious horizontal overflow" },
    ],
  },
  {
    id: "search_or_filter",
    label: "Search or catalog filter",
    dimension: "ux",
    description: "Site search or filter for large catalogs",
    criteria: [
      { id: "site_search", label: "Site search available" },
      { id: "category_filters", label: "Category or filter controls" },
      { id: "sort_options", label: "Sort options for listings" },
      { id: "findability_from_home", label: "Findable from homepage or nav" },
    ],
  },
  {
    id: "live_chat",
    label: "Live chat / instant support",
    dimension: "conversion",
    description: "Chat widget or instant messaging for questions",
    criteria: [
      { id: "chat_widget", label: "Live chat widget present" },
      { id: "instant_messaging_link", label: "Instant messaging link (WhatsApp, etc.)" },
      { id: "response_time_claim", label: "Response time or availability stated" },
      { id: "support_entry_points", label: "Support entry on product/checkout pages" },
    ],
  },
];

export const FEATURE_BY_ID = new Map(FEATURE_TAXONOMY.map((f) => [f.id, f]));

export const CRITERION_BY_ID = new Map(
  FEATURE_TAXONOMY.flatMap((f) =>
    f.criteria.map((c) => [`${f.id}:${c.id}`, { ...c, featureId: f.id }] as const),
  ),
);

export function featureIds(): string[] {
  return FEATURE_TAXONOMY.map((f) => f.id);
}

export function computeFeatureScoreFromDefinitions(
  featureId: string,
  criterionScores: Array<{ criterionId: string; score: number }>,
): number {
  const def = FEATURE_BY_ID.get(featureId);
  if (!def) return 0;
  return scoreFromCriteriaDefinitions(criterionScores, def.criteria);
}

export { computeFeatureScore };
