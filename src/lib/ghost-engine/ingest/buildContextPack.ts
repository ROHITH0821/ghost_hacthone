import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import { ghostSystem, evidenceText } from "../prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";

import { anthropic } from "../client";
import {
  MODEL,
  MAX_TOKENS_CONTEXT_PACK,
  CONTEXT_PACK_TEXT_CAP,
  CONTEXT_PACK_TAIL_TEXT_CAP,
  CONTEXT_PACK_FULL_PAGES,
  STRUCTURED_THINKING,
} from "../config";
import { ContextPackSchema, type ContextPack, type ContextPackPage } from "../types";
import type { RawCrawl } from "./crawl";
import type { RawPage } from "./extract";
import { journeyPathScore } from "./prioritize";
import { normalizePageUrl } from "./urlUtils";

/**
 * Stage 1.4 — Context Pack synthesis.
 *
 * The crawler gives us raw pages (text, meta, structured data, screenshots). Our
 * engine needs the *interpreted* view a customer experiences: which prices are
 * actually visible, the real CTAs, the visual hierarchy, the trust signals. Those
 * don't exist in raw HTML — an LLM derives them. This is that single call: raw
 * crawl (+ screenshots via vision) → a zod-validated ContextPack.
 */

const SYNTH_SYSTEM = `
You convert a raw website crawl into a "Context Pack" — a structured description of a
business's online presence AS A CUSTOMER ACTUALLY EXPERIENCES IT. This pack feeds an
audit that finds where customers give up, so accuracy about what a visitor can and cannot
find matters more than marketing polish.

You are given crawled pages (URL, title, meta description, visible text, structured data)
and full-page SCREENSHOTS of the most important pages. Use the screenshots to judge visual
hierarchy — what a real visitor sees first, what is buried, what is above the fold.

Produce the Context Pack with these fields, grounded ONLY in the crawl (never invent):

- business: { name, type (e.g. salon, cafe, web agency, boutique, gym…), location }.
  Infer from titles, text, and structured data. If location isn't stated, say "not stated on site".
- pages[]: one entry per supplied page (every URL in the payload). Journey pages can have
  a one-or-two sentence summary; long-tail pages can be a single short sentence.
    - url, title
    - summary: what the page offers
    - prices_visible: judge how many real prices a customer can actually see —
      "none", "partial — N of M services/products", or "all". "Contact for quote",
      "DM for price", and login-walled prices count as NOT visible. Use "unknown" for
      thin long-tail pages where prices cannot be judged.
    - ctas: the ACTUAL call-to-action button/link texts on the page (e.g. "Book Now",
      "Get a Quote", "Add to Cart", "Contact for price"). Empty array if none.
    - visual_notes: what a human SEES from the screenshot — hierarchy, what's above the
      fold, what's buried, how many hero banners before real content. If there is no
      screenshot for this page, base it on structure and say "(no screenshot — inferred)".
- nav_structure: the main navigation items.
- contact_paths: every real way a customer can contact/book — form (with field count if
  known), phone (and whether it's prominent or buried), WhatsApp, email, chat. Be specific.
- search: { exists: whether a product/service search control is observed; functionality is unverified unless tested evidence is supplied }.
- reviews: { visible: whether ratings, testimonials, or a review widget are shown to visitors }.
- trust_signals: concrete signals present OR notably ABSENT — address shown/missing,
  real shopfront/staff photos, reviews, credentials, years in business. The absences are
  as important as the presences.

Be precise and customer-eyed. If the business hides prices, has no reviews, or buries its
phone number, say so plainly — that is exactly what the audit needs.
`.trim();

function pageKey(url: string): string {
  try {
    return normalizePageUrl(url);
  } catch {
    return url;
  }
}

function fullExcerptUrls(pages: RawPage[]): Set<string> {
  const ranked = [...pages].sort((a, b) => journeyPathScore(b.url) - journeyPathScore(a.url));
  return new Set(ranked.slice(0, CONTEXT_PACK_FULL_PAGES).map((p) => pageKey(p.url)));
}

/** Compact the crawl into a token-bounded text payload for synthesis. */
function crawlToText(crawl: RawCrawl): string {
  const fullUrls = fullExcerptUrls(crawl.pages);
  const selectedPages = [...crawl.pages].sort((a,b) => journeyPathScore(b.url)-journeyPathScore(a.url)).slice(0, 24);
  const pages = selectedPages
    .map((p, i) => {
      const cap = fullUrls.has(pageKey(p.url)) ? CONTEXT_PACK_TEXT_CAP : CONTEXT_PACK_TAIL_TEXT_CAP;
      const parts = [
        `### PAGE ${i + 1}: ${p.url}`,
        `title: ${p.title || "(none)"}`,
        p.metaDescription ? `meta: ${p.metaDescription}` : "",
        p.screenshotB64 ? `screenshot: attached below` : "",
        p.jsonld.length ? `structured_data: ${JSON.stringify(p.jsonld).slice(0, 1500)}` : "",
        `text: ${p.text.slice(0, cap)}`,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");

  return `ROOT: ${crawl.rootUrl}
PAGES CRAWLED: ${crawl.pages.length}
PAGES INCLUDED: ${selectedPages.length}. Summarize only the supplied pages. Other crawled URLs are merged deterministically as unknown; never infer missing features from omitted pages.

${pages}`;
}

function stubPage(page: RawPage): ContextPackPage {
  const excerpt = (page.metaDescription || page.text.replace(/\s+/g, " ").trim()).slice(0, 280);
  return {
    url: page.url,
    title: page.title || page.url,
    summary: excerpt || "(crawled — not expanded in synthesis)",
    prices_visible: "unknown",
    ctas: [],
    visual_notes: "(no screenshot — inferred)",
  };
}

/** Ensure the pack lists every crawled URL even if synthesis skipped the long tail. */
function mergeMissingPages(pack: ContextPack, crawl: RawCrawl): ContextPack {
  const allowed = new Set(crawl.pages.map(p => pageKey(p.url)));
  pack = { ...pack, pages: pack.pages.filter(p => allowed.has(pageKey(p.url))) };
  const have = new Set(pack.pages.map((p) => pageKey(p.url)));
  const extras: ContextPackPage[] = [];
  for (const page of crawl.pages) {
    const key = pageKey(page.url);
    if (have.has(key)) continue;
    extras.push(stubPage(page));
    have.add(key);
  }
  if (extras.length === 0) return pack;
  return { ...pack, pages: [...pack.pages, ...extras] };
}

export async function buildContextPack(crawl: RawCrawl): Promise<ContextPack> {
  if (crawl.pages.length === 0) {
    throw new Error(`Crawl of ${crawl.rootUrl} returned no usable pages.`);
  }

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: evidenceText(crawlToText(crawl)) },
  ];

  // Attach the screenshots (vision) so visual_notes reflects what a visitor sees.
  for (const page of crawl.pages) {
    if (!page.screenshotB64) continue;
    content.push({ type: "text", text: `Screenshot of ${page.url}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: page.screenshotB64 },
    });
  }

  const response = await parseStructuredWithTimeout("buildContextPack", (signal) => anthropic().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS_CONTEXT_PACK,
    thinking: STRUCTURED_THINKING,
    system: ghostSystem("Synthesize crawl evidence", SYNTH_SYSTEM),
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ContextPackSchema) },
  }, { signal, maxRetries: 0 }));

  const pack = response.parsed_output;
  if (!pack) {
    throw new Error(
      `Context Pack synthesis returned nothing parseable (stop_reason=${response.stop_reason}).`,
    );
  }
  return mergeMissingPages(pack, crawl);
}
