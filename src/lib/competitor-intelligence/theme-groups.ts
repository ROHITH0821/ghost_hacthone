import { FEATURE_TAXONOMY } from "./feature-taxonomy";

export type ThemeId =
  | "pricing_plans"
  | "trust_credibility"
  | "product_information"
  | "contact_support"
  | "buying_journey"
  | "company_trust"
  | "user_experience";

export type ThemeImpact = "critical" | "high" | "medium" | "low";

export interface ThemeGroupConfig {
  id: ThemeId;
  title: string;
  /** Default sort bucket when gap severity is tied */
  defaultImpact: ThemeImpact;
  /** Plain-English business impact (deterministic) */
  whyItMatters: string;
  /** Taxonomy feature ids; equal weight unless weight set */
  features: Array<{ featureId: string; weight?: number }>;
  /** Fallback action when no market_gaps recommendation */
  defaultAction: string;
}

/**
 * Presentation-only grouping of taxonomy features into business themes.
 * Feature Extraction / taxonomy remain unchanged — edit this map when adding features.
 */
export const THEME_GROUPS: ThemeGroupConfig[] = [
  {
    id: "pricing_plans",
    title: "Pricing & Plans",
    defaultImpact: "critical",
    whyItMatters:
      "Hidden or unclear pricing increases abandonment before buyers contact sales or start a trial.",
    features: [{ featureId: "pricing_transparency" }],
    defaultAction:
      "Publish clear packages or starting prices on a dedicated pricing page linked from the main nav.",
  },
  {
    id: "trust_credibility",
    title: "Trust & Credibility",
    defaultImpact: "high",
    whyItMatters:
      "Buyers look for social proof and credentials before they trust a new vendor with budget or data.",
    features: [
      { featureId: "testimonials" },
      { featureId: "reviews_social_proof" },
      { featureId: "case_studies" },
      { featureId: "accreditations" },
    ],
    defaultAction:
      "Add named testimonials, measurable case studies, or recognizable certifications above the fold on key pages.",
  },
  {
    id: "product_information",
    title: "Product Information",
    defaultImpact: "high",
    whyItMatters:
      "Incomplete product detail and buried FAQs force buyers to guess fit — or leave to ask sales.",
    features: [
      { featureId: "product_detail_depth" },
      { featureId: "faq_section" },
    ],
    defaultAction:
      "Spell out inclusions, deliverables, and a searchable FAQ for the questions buyers ask before purchase.",
  },
  {
    id: "contact_support",
    title: "Contact & Support",
    defaultImpact: "high",
    whyItMatters:
      "Limited contact options slow high-intent buyers who want a human answer before they commit.",
    features: [
      { featureId: "contact_multiple_channels" },
      { featureId: "live_chat" },
    ],
    defaultAction:
      "Offer phone, email, and chat or messaging on product and pricing pages with clear response expectations.",
  },
  {
    id: "buying_journey",
    title: "Buying Journey",
    defaultImpact: "critical",
    whyItMatters:
      "Weak CTAs, unclear policies, or hard-to-find offerings stall the path from interest to purchase.",
    features: [
      { featureId: "booking_cta" },
      { featureId: "shipping_returns_policy" },
      { featureId: "search_or_filter" },
    ],
    defaultAction:
      "Put a clear Book/Buy/Demo CTA above the fold and make policies and catalog findability obvious.",
  },
  {
    id: "company_trust",
    title: "Company Trust",
    defaultImpact: "medium",
    whyItMatters:
      "A thin about story or invisible team makes the brand feel anonymous — a risk for B2B buyers.",
    features: [
      { featureId: "about_story" },
      { featureId: "founder_visibility" },
    ],
    defaultAction:
      "Strengthen About with mission, differentiation, and named people buyers can relate to.",
  },
  {
    id: "user_experience",
    title: "User Experience",
    defaultImpact: "medium",
    whyItMatters:
      "Poor mobile layout loses mobile-first traffic before they ever see your offer or proof.",
    features: [{ featureId: "mobile_friendly_signals" }],
    defaultAction:
      "Fix mobile readability, navigation, and tap targets on homepage and conversion pages.",
  },
];

/** Dev/runtime check: every taxonomy feature belongs to exactly one theme. */
export function assertThemeGroupsCoverTaxonomy(): void {
  const covered = new Map<string, ThemeId>();
  for (const theme of THEME_GROUPS) {
    for (const f of theme.features) {
      if (covered.has(f.featureId)) {
        throw new Error(
          `Theme feature ${f.featureId} appears in both ${covered.get(f.featureId)} and ${theme.id}`,
        );
      }
      covered.set(f.featureId, theme.id);
    }
  }
  for (const def of FEATURE_TAXONOMY) {
    if (!covered.has(def.id)) {
      throw new Error(
        `Taxonomy feature ${def.id} is missing from THEME_GROUPS — add it to theme-groups.ts`,
      );
    }
  }
}

// Validate on module load in non-production-safe way (throws early in tests/dev)
assertThemeGroupsCoverTaxonomy();
