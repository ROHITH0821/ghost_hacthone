import type { ContextPack } from "../types";
import type { DimensionScore, ScoreCheck } from "./types";
import {
  applyChecklist,
  hasEmail,
  hasNavItem,
  hasPhone,
  hasWhatsApp,
  isLocationStated,
  normalize,
  pricesAnyVisible,
} from "./utils";

export function scoreInformation(pack: ContextPack): DimensionScore {
  const checks: ScoreCheck[] = [];

  const services = pack.pages.some((p) =>
    /service|menu|products|portfolio|our work|treatments/i.test(normalize(p.title + " " + p.summary)),
  );
  checks.push({
    id: "services_described",
    label: "Services/products are clearly described on at least one page.",
    passed: services,
    points: services ? 8 : -6,
    evidence: services ? "Service/product-like pages detected in titles/summaries." : "No strong service/product page evidence detected.",
  });

  const pricing = pricesAnyVisible(pack);
  checks.push({
    id: "pricing_findable",
    label: "Pricing is findable (partial or full).",
    passed: pricing,
    points: pricing ? 8 : -8,
    evidence: pricing ? "Context Pack indicates pricing is visible on some pages." : "Context Pack indicates pricing is not visible.",
  });

  const location = isLocationStated(pack);
  checks.push({
    id: "location_stated",
    label: "Location is stated.",
    passed: location,
    points: location ? 6 : -4,
    evidence: pack.business.location || "Location missing from Context Pack.",
  });

  const faq = hasNavItem(pack, [/faq/, /frequently asked/]) || pack.pages.some((p) => /faq|frequently asked/i.test(normalize(p.title)));
  checks.push({
    id: "faq_present",
    label: "An FAQ (or equivalent) exists.",
    passed: faq,
    points: faq ? 5 : 0,
    evidence: faq ? "FAQ found in nav/pages." : "No FAQ detected in nav/pages.",
  });

  const hours = pack.pages.some((p) => /hours|timing|open|closed|mon|tue|wed|thu|fri|sat|sun/i.test(normalize(p.summary + " " + p.visual_notes)));
  checks.push({
    id: "hours_present",
    label: "Business hours/timings are mentioned somewhere.",
    passed: hours,
    points: hours ? 5 : 0,
    evidence: hours ? "Context Pack text suggests hours/timings are present." : "No clear hours/timings mention detected.",
  });

  const contactComplete = hasPhone(pack) && (hasEmail(pack) || hasWhatsApp(pack) || pack.contact_paths.length > 0);
  checks.push({
    id: "contact_complete",
    label: "Contact information is reasonably complete (phone + another method).",
    passed: contactComplete,
    points: contactComplete ? 6 : -6,
    evidence: pack.contact_paths.join(" | ") || "No contact paths listed.",
  });

  const { value } = applyChecklist(55, checks);
  return {
    id: "information",
    label: "Information Quality",
    weight: 0.1,
    value,
    contribution: Math.round(value * 0.1),
    checks,
  };
}

