/**
 * Deterministic (no LLM) taxonomy proxy coverage for competitor crawl packs.
 * Maps fetched pages → which taxonomy features *could* be evaluated from URL/path/text.
 * Real verified/partial/absent status comes from Feature Extraction after crawl.
 */

import {
  COMPETITOR_COVERAGE_STOP,
  COMPETITOR_MIN_RICH_PAGES_FOR_STOP,
} from "./config";
import { FEATURE_TAXONOMY } from "./feature-taxonomy";

export type ProxyFeatureState = "proxy_hit" | "not_crawled" | "not_applicable";

export type CrawlStopReason = "coverage" | "budget" | "queue_exhausted";

export interface TaxonomyProxyCoverage {
  /** 0–1 over applicable features only */
  coverage: number;
  applicableCount: number;
  hitCount: number;
  richPages: number;
  highValuePages: number;
  states: Record<string, ProxyFeatureState>;
  sufficient: boolean;
}

type PageLike = {
  url: string;
  title?: string;
  text?: string;
  textExcerpt?: string;
};

const RICH_CHARS = 400;

/** Path/text patterns that indicate a page can inform a taxonomy feature. */
const FEATURE_PROXY: Record<
  string,
  { path: RegExp; text?: RegExp }
> = {
  pricing_transparency: {
    path: /\/(pricing|prices|plans|rates|packages?|quote)(\/|$)/i,
    text: /\b(pricing|price|plans?|packages?|per\s*month|subscription|starting\s*at|\$\d)\b/i,
  },
  faq_section: {
    path: /\/(faq|faqs|help|support|questions)(\/|$)/i,
    text: /\b(faq|frequently\s+asked|common\s+questions)\b/i,
  },
  testimonials: {
    path: /\/(testimonials?|reviews?|customers?|clients?)(\/|$)/i,
    text: /\b(testimonial|customer\s+stor|"[^"]{20,}"|what\s+our\s+customers)\b/i,
  },
  reviews_social_proof: {
    path: /\/(reviews?|ratings?|g2|capterra|trustpilot)(\/|$)/i,
    text: /\b(\d\.\d\s*\/\s*5|star\s*rating|reviews?\s+on|rated\s+)\b/i,
  },
  case_studies: {
    path: /\/(case-stud|success-stor|customers?|clients?|portfolio)(\/|$)/i,
    text: /\b(case\s+stud|success\s+stor|customer\s+stor|how\s+.+\s+achieved)\b/i,
  },
  accreditations: {
    path: /\/(partners?|certifications?|security|compliance|trust)(\/|$)/i,
    text: /\b(iso\s*\d|soc\s*2|gdpr|certified|accreditation|partner\s+logo)\b/i,
  },
  founder_visibility: {
    path: /\/(about|team|leadership|founders?|who-we-are|company)(\/|$)/i,
    text: /\b(founder|ceo|our\s+team|leadership|meet\s+the)\b/i,
  },
  contact_multiple_channels: {
    path: /\/(contact|reach|get-in-touch|support|sales)(\/|$)/i,
    text: /\b(contact\s+us|email\s*us|phone|whatsapp|get\s+in\s+touch|sales@)\b/i,
  },
  booking_cta: {
    path: /\/(demo|trial|get-started|start-free|book|booking|signup|sign-up|contact)(\/|$)/i,
    text: /\b(book\s+(a\s+)?demo|start\s+(free\s+)?trial|get\s+started|request\s+demo|sign\s*up)\b/i,
  },
  shipping_returns_policy: {
    path: /\/(shipping|returns?|delivery|refund)(\/|$)/i,
    text: /\b(shipping|returns?|delivery\s+time|refund\s+polic)\b/i,
  },
  about_story: {
    path: /\/(about|company|who-we-are|our-story|mission)(\/|$)/i,
    text: /\b(about\s+us|our\s+mission|our\s+story|founded|we\s+believe)\b/i,
  },
  product_detail_depth: {
    path: /\/(products?|solutions?|platform|features?|services?|offerings?)(\/|$)/i,
    text: /\b(platform|solution|features?|capabilities|how\s+it\s+works|product)\b/i,
  },
  mobile_friendly_signals: {
    path: /./i,
    text: /\b(mobile|responsive|app\s+store|download\s+app)\b/i,
  },
  search_or_filter: {
    path: /\/(shop|store|catalog|products?|search)(\/|$)/i,
    text: /\b(search|filter|sort\s+by|categories)\b/i,
  },
  live_chat: {
    path: /\/(support|help|contact|chat)(\/|$)/i,
    text: /\b(live\s+chat|chat\s+with|intercom|drift|zendesk\s+chat)\b/i,
  },
};

const HIGH_VALUE_PATH =
  /\/(pricing|prices|plans|products?|solutions?|platform|features?|services?|about|company|contact|demo|trial|customers?|case-stud|testimonials?|faq|support|docs)(\/|$)/i;

function pageHaystack(page: PageLike): { path: string; hay: string } {
  let path = "/";
  try {
    path = new URL(page.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    path = page.url;
  }
  const text = (page.text ?? page.textExcerpt ?? "").replace(/\s+/g, " ").trim();
  const hay = `${page.url} ${page.title ?? ""} ${text.slice(0, 4000)}`;
  return { path, hay };
}

export function richPageCount(pages: PageLike[]): number {
  return pages.filter((p) => {
    const t = (p.text ?? p.textExcerpt ?? "").replace(/\s+/g, " ").trim();
    return t.length > RICH_CHARS;
  }).length;
}

export function highValuePageCount(pages: PageLike[]): number {
  return pages.filter((p) => {
    try {
      const path = new URL(p.url).pathname;
      if (path === "/" || path === "") return true;
      return HIGH_VALUE_PATH.test(path);
    } catch {
      return false;
    }
  }).length;
}

/** Heuristic: shipping/returns rarely applies to pure B2B SaaS with no commerce paths. */
function isShippingApplicable(pages: PageLike[]): boolean {
  const all = pages.map(pageHaystack);
  const commercePath = all.some(
    (p) =>
      /\/(shop|store|cart|checkout|shipping|returns?|products?\/)/i.test(p.path) ||
      /\b(add\s+to\s+cart|free\s+shipping|return\s+window)\b/i.test(p.hay),
  );
  if (commercePath) return true;
  const saasSignals = all.filter((p) =>
    /\b(saas|platform|api|advertisers?|publishers?|dsp|ssp|sdk|enterprise)\b/i.test(
      p.hay,
    ),
  ).length;
  if (saasSignals >= 1 && pages.length >= 2) return false;
  return true;
}

function featureHasProxyHit(featureId: string, pages: PageLike[]): boolean {
  const rules = FEATURE_PROXY[featureId];
  if (!rules) {
    return pages.some((p) => {
      try {
        const path = new URL(p.url).pathname.replace(/\/+$/, "") || "/";
        return path === "/" && richPageCount([p]) > 0;
      } catch {
        return false;
      }
    });
  }

  for (const page of pages) {
    const { path, hay } = pageHaystack(page);
    if (featureId === "mobile_friendly_signals") {
      if (
        (page.text ?? page.textExcerpt ?? "").replace(/\s+/g, " ").trim().length >
        RICH_CHARS
      ) {
        return true;
      }
      continue;
    }
    if (rules.path.test(path)) return true;
    // Homepage body text alone only for a few features — avoids keyword early-stop
    const isHome = path === "/";
    if (isHome && rules.text?.test(hay)) {
      if (
        featureId === "booking_cta" ||
        featureId === "product_detail_depth" ||
        featureId === "about_story" ||
        featureId === "contact_multiple_channels"
      ) {
        return true;
      }
    }
    if (!isHome && rules.text?.test(hay)) return true;
  }
  return false;
}

export function computeTaxonomyProxyCoverage(pages: PageLike[]): TaxonomyProxyCoverage {
  const states: Record<string, ProxyFeatureState> = {};
  let applicableCount = 0;
  let hitCount = 0;

  const shippingApplicable = isShippingApplicable(pages);

  for (const def of FEATURE_TAXONOMY) {
    if (def.id === "shipping_returns_policy" && !shippingApplicable) {
      states[def.id] = "not_applicable";
      continue;
    }
    applicableCount += 1;
    if (featureHasProxyHit(def.id, pages)) {
      states[def.id] = "proxy_hit";
      hitCount += 1;
    } else {
      states[def.id] = "not_crawled";
    }
  }

  const coverage = applicableCount > 0 ? hitCount / applicableCount : 0;
  const richPages = richPageCount(pages);
  const highValuePages = highValuePageCount(pages);
  const sufficient =
    richPages >= COMPETITOR_MIN_RICH_PAGES_FOR_STOP &&
    coverage >= COMPETITOR_COVERAGE_STOP;

  return {
    coverage,
    applicableCount,
    hitCount,
    richPages,
    highValuePages,
    states,
    sufficient,
  };
}

/** True when crawl has enough taxonomy proxy coverage for pack metrics. */
export function hasSufficientCompetitorEvidence(pages: PageLike[]): boolean {
  return computeTaxonomyProxyCoverage(pages).sufficient;
}

/** @deprecated Prefer computeTaxonomyProxyCoverage */
export function evidenceBucketsFromPages(pages: PageLike[]): Set<string> {
  const cov = computeTaxonomyProxyCoverage(pages);
  return new Set(
    Object.entries(cov.states)
      .filter(([, s]) => s === "proxy_hit")
      .map(([id]) => id),
  );
}
