import type { ContextPack } from "../types";
import type { DimensionScore, ScoreCheck } from "./types";
import {
  applyChecklist,
  hasCta,
  hasPhone,
  hasWhatsApp,
  homepage,
  pricesAllVisible,
  pricesAnyVisible,
  normalize,
} from "./utils";

const CTA_PATTERNS = [/book/, /schedule/, /appointment/, /get a quote/, /quote/, /enquire/, /enquiry/, /contact/, /call now/];

export function scoreConversion(pack: ContextPack): DimensionScore {
  const checks: ScoreCheck[] = [];
  const home = homepage(pack);

  const homeCtas = home?.ctas ?? [];
  const hasHomeCta = homeCtas.length > 0;
  checks.push({
    id: "homepage_cta",
    label: "Homepage shows at least one clear call-to-action (CTA).",
    passed: hasHomeCta,
    points: hasHomeCta ? 8 : -10,
    evidence: hasHomeCta ? `Homepage CTAs: ${homeCtas.join(", ")}` : "Homepage CTAs: (none)",
  });

  const hasPrimary = hasCta(pack, CTA_PATTERNS);
  checks.push({
    id: "book_quote_cta",
    label: "Booking/quote/contact CTAs exist somewhere on the site.",
    passed: hasPrimary,
    points: hasPrimary ? 8 : -6,
    evidence: hasPrimary ? "Context Pack includes booking/quote/contact CTAs." : "No booking/quote/contact CTA text detected.",
  });

  const phone = hasPhone(pack);
  checks.push({
    id: "call_option",
    label: "A phone/call option is available for fast contact.",
    passed: phone,
    points: phone ? 5 : 0,
    evidence: pack.contact_paths.join(" | ") || "No contact paths listed.",
  });

  const wa = hasWhatsApp(pack);
  checks.push({
    id: "whatsapp_option",
    label: "WhatsApp is available for lead capture.",
    passed: wa,
    points: wa ? 5 : 0,
    evidence: pack.contact_paths.join(" | ") || "No contact paths listed.",
  });

  const anyPricing = pricesAnyVisible(pack);
  checks.push({
    id: "pricing_any",
    label: "Some pricing is visible (not only “contact for quote”).",
    passed: anyPricing,
    points: anyPricing ? 8 : -8,
    evidence: anyPricing
      ? "At least one page shows prices partially or fully."
      : "All pages indicate pricing is not visible.",
  });

  const fullPricing = pricesAllVisible(pack);
  checks.push({
    id: "pricing_all",
    label: "Full pricing is visible on at least one page.",
    passed: fullPricing,
    points: fullPricing ? 4 : 0,
    evidence: fullPricing ? "At least one page has prices_visible=all." : "No page has prices_visible=all.",
  });

  const offers = pack.pages.some((p) => /offer|package|deal|discount/i.test(normalize(p.summary)));
  checks.push({
    id: "offers",
    label: "Offers/packages are mentioned (helps conversion for many SMBs).",
    passed: offers,
    points: offers ? 4 : 0,
    evidence: offers ? "A page summary mentions offers/packages." : "No offer/package language detected in summaries.",
  });

  const { value } = applyChecklist(55, checks);
  return {
    id: "conversion",
    label: "Conversion Optimization",
    weight: 0.2,
    value,
    contribution: Math.round(value * 0.2),
    checks,
  };
}

