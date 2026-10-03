import { normalizePageUrl } from "@/lib/ghost-engine/ingest/urlUtils";

/**
 * Cheap, LLM-free page prioritization. An audit cares about the customer-journey
 * pages (home, services/products, pricing, contact, about, booking, reviews) —
 * not blog posts, legal, or account pages. We rank discovered URLs by their path
 * so the crawler spends its page budget where the money is.
 */

// Path substrings that signal a high-value journey page → boosted.
// SaaS + SMB: Pricing → Product → Solutions → Platform → Customers → Case Studies → Features → Demo → About → Resources
const JOURNEY_HINTS: Array<[RegExp, number]> = [
  [/\/(pricing|prices|plans|rates|packages?|quote)(\/|$)/i, 10],
  [/\/(products?|shop|store|catalog|menu)(\/|$)/i, 9],
  [/\/(solutions?|platform)(\/|$)/i, 9],
  [/\/(features?|capabilities)(\/|$)/i, 8],
  [/\/(customers?|clients?|logos?)(\/|$)/i, 8],
  [/\/(case-stud|success-stor|testimonials?|reviews?|ratings?)(\/|$)/i, 8],
  [/\/(demo|trial|get-started|start-free)(\/|$)/i, 7],
  [/\/(services?|offerings?)(\/|$)/i, 6],
  [/\/(book|booking|appointment|reserve|order|checkout|enquir|enquiry|contact|reach|get-in-touch)(\/|$)/i, 6],
  [/\/(about|team|who-we-are|company)(\/|$)/i, 5],
  [/\/(faq|faqs|help-center|support)(\/|$)/i, 5],
  [/\/(resources?|docs|documentation|learn)(\/|$)/i, 4],
  [/\/(gallery|portfolio|work)(\/|$)/i, 2],
];

// Path substrings that signal a low-value page for an audit → dropped.
const DROP_HINTS =
  /\/(blog|news|article|post|privacy|terms|policy|policies|refund|cookie|disclaimer|careers?|jobs|login|signin|sign-in|register|signup|account|cart|wishlist|referral|affiliate|sitemap|tag|category|author|wp-admin|feed)(\/|$)/i;

/** Locale-only path segments (demote / drop when a non-locale twin exists). */
const LOCALE_SEGMENT =
  /^(en|en-us|en-gb|en-au|en-in|fr|de|es|it|pt|pt-br|ja|zh|zh-cn|zh-tw|ko|nl|pl|ru|ar|hi|id|th|vi|tr|sv|da|fi|no|nb|cs|ro|uk|he|el)(-[a-z]{2})?$/i;

/**
 * Dedupe key: origin + path without query/hash; strip trailing slash;
 * collapse leading locale segment for twin detection.
 */
export function normalizePageUrlForDedupe(url: string): string {
  const parsed = new URL(normalizePageUrl(url));
  parsed.search = "";
  parsed.hash = "";
  let path = parsed.pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 1 && LOCALE_SEGMENT.test(parts[0])) {
    parts.shift();
    path = parts.length ? `/${parts.join("/")}` : "/";
  }
  parsed.pathname = path;
  return parsed.origin + (path === "/" ? "/" : path);
}

function pathScore(url: string): number {
  let path: string;
  try {
    path = new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return -1;
  }

  if (path === "/") return 100; // homepage always wins
  if (DROP_HINTS.test(path)) return -1;

  const parts = path.split("/").filter(Boolean);
  // Pure locale homepage like /en — treat as near-home but below real /
  if (parts.length === 1 && LOCALE_SEGMENT.test(parts[0])) return 50;

  let score = 1;
  for (const [pattern, weight] of JOURNEY_HINTS) if (pattern.test(path)) score += weight;

  // Prefer shallow pages; deep nested paths are usually detail/blog-like.
  const depth = parts.length;
  score -= Math.max(0, depth - 1);

  // Soft-demote locale-prefixed marketing pages vs non-locale twins
  if (parts.length >= 1 && LOCALE_SEGMENT.test(parts[0])) score -= 2;

  return score;
}

/**
 * Return the root URL first, then the highest-scoring journey pages, dropping
 * blog/legal/account pages and query/locale dupes. When `maxPages` is set, slice
 * to that ceiling — callers that BFS should omit it and apply the fetch cap later.
 */
export function prioritizeUrls(rootUrl: string, urls: string[], maxPages?: number): string[] {
  const root = normalizePageUrl(rootUrl);
  const rootKey = normalizePageUrlForDedupe(root);
  const seenKeys = new Set<string>([rootKey]);

  const scored: Array<{ url: string; score: number }> = [];
  for (const raw of urls) {
    let url: string;
    try {
      url = normalizePageUrl(raw);
    } catch {
      continue;
    }
    const key = normalizePageUrlForDedupe(url);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const score = pathScore(url);
    if (score < 0) continue;
    scored.push({ url, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const ordered = [root, ...scored.map((x) => x.url)];
  if (maxPages == null) return ordered;
  return ordered.slice(0, Math.max(1, maxPages));
}

/** Export path score for picking extract-prompt pages. */
export function journeyPathScore(url: string): number {
  return pathScore(url);
}
