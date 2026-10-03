import * as cheerio from "cheerio";
import type { Browser, Page } from "playwright";

import { FETCH_TIMEOUT_MS } from "../config";
import { getOrigin, isCrawlableUrl, isSameOrigin, normalizePageUrl } from "./urlUtils";

/**
 * Per-page extraction. Static-first (fast `fetch` + cheerio); falls back to a
 * Playwright render for JS-heavy pages or when a screenshot is requested.
 *
 * Ported from the takeover extractor with three changes for GHOST:
 *  - The dynamic fallback triggers on thin *text* alone. The original also
 *    required zero images, but an og:image always counts as an image, so a
 *    JS-rendered storefront with no readable text was never re-rendered.
 *  - Screenshots can be requested per page (visual_notes needs them), and are
 *    bounded-viewport (not full-page, which can exceed the vision 8000px limit).
 *  - No module-level browser singleton: the browser is owned by the caller (one
 *    per crawl), so concurrent/repeated crawls from a server are safe.
 */

export const USER_AGENT = "Mozilla/5.0 (compatible; GhostBot/1.0)";

const THIN_TEXT_CHARS = 400;
const RENDER_TIMEOUT_MS = 20000;

// Screenshot dimensions. We capture a desktop-width viewport with a capped
// height rather than the full page: Anthropic's vision API rejects any image
// dimension over 8000px, and the model downscales to a ~1568px long edge anyway,
// so a very tall full-page shot is both rejected and useless. The top of the
// page is also what matters most for judging visual hierarchy / above-the-fold.
const SHOT_WIDTH = 1280;
const SHOT_HEIGHT = 2000;

export interface RawPage {
  url: string;
  title: string;
  metaDescription: string;
  ogTags: Record<string, string>;
  jsonld: unknown[];
  text: string;
  images: string[];
  screenshotB64?: string;
  renderedWith: "static" | "dynamic";
  /** Same-origin crawlable `a[href]` links found on this page (BFS seed). */
  discoveredLinks: string[];
}

/** Lazily provides a shared browser for one crawl. Owned by the caller. */
export type BrowserProvider = () => Promise<Browser>;

type Extracted = Omit<RawPage, "url" | "renderedWith" | "screenshotB64">;

function emptyPage(url: string): RawPage {
  return {
    url,
    title: "",
    metaDescription: "",
    ogTags: {},
    jsonld: [],
    text: "",
    images: [],
    renderedWith: "static",
    discoveredLinks: [],
  };
}

// --- extraction -------------------------------------------------------------

function resolveImageUrl(src: string, baseUrl: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

function collectSameOriginLinks($: ReturnType<typeof cheerio.load>, baseUrl: string): string[] {
  const origin = getOrigin(baseUrl);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, baseUrl).href;
      if (isSameOrigin(absolute, origin) && isCrawlableUrl(absolute)) {
        urls.add(normalizePageUrl(absolute));
      }
    } catch {
      // skip invalid URLs
    }
  });
  return Array.from(urls);
}

function extractFromHtml(html: string, baseUrl: string): Extracted {
  const $ = cheerio.load(html);
  const discoveredLinks = collectSameOriginLinks($, baseUrl);
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim();

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr("property");
    const content = $(el).attr("content");
    if (property && content) ogTags[property] = content;
  });
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr("name");
    const content = $(el).attr("content");
    if (name && content) ogTags[name] = content;
  });

  let metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
  if (!metaDescription && ogTags["og:description"]) metaDescription = ogTags["og:description"];

  const jsonld: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      jsonld.push(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  });

  const text = $("body").text().replace(/\s+/g, " ").trim();

  const imageSet = new Set<string>();
  $("img").each((_, el) => {
    for (const candidate of [$(el).attr("src"), $(el).attr("data-src")]) {
      const resolved = candidate ? resolveImageUrl(candidate, baseUrl) : null;
      if (resolved) imageSet.add(resolved);
    }
  });
  const ogImage = ogTags["og:image"];
  if (ogImage) {
    const resolved = resolveImageUrl(ogImage, baseUrl);
    if (resolved) imageSet.add(resolved);
  }

  return {
    title,
    metaDescription,
    ogTags,
    jsonld,
    text,
    images: Array.from(imageSet).slice(0, 12),
    discoveredLinks,
  };
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

async function staticPass(url: string): Promise<Extracted> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  return extractFromHtml(await response.text(), url);
}

async function dynamicPass(
  url: string,
  browser: Browser,
  withScreenshot: boolean,
): Promise<{ extracted: Extracted; screenshotB64?: string }> {
  const context = await browser.newContext({
    viewport: { width: SHOT_WIDTH, height: SHOT_HEIGHT },
    deviceScaleFactor: 1,
    userAgent: USER_AGENT,
  });
  const page = await context.newPage();
  try {
    // Use domcontentloaded, NOT networkidle: heavy sites (analytics, chat, ads,
    // infinite-scroll) never go idle, so networkidle would time out and fail the
    // whole render — leaving us with the blank JS shell. Instead: load the DOM,
    // best-effort wait for the network to settle (capped), scroll to trigger
    // lazy content, then give the SPA a moment to paint products/prices.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await autoScroll(page);
    await page.waitForTimeout(1200);
    const extracted = extractFromHtml(await page.content(), url);
    let screenshotB64: string | undefined;
    if (withScreenshot) {
      // Back to the top, then capture just the viewport (bounded height) — never
      // fullPage, which can exceed the 8000px vision limit on long pages.
      await page.evaluate(() => window.scrollTo(0, 0));
      const shot = await page.screenshot(); // viewport only: SHOT_WIDTH × SHOT_HEIGHT
      screenshotB64 = shot.toString("base64");
    }
    return { extracted, screenshotB64 };
  } finally {
    await context.close();
  }
}

/**
 * Fetch one page. Renders with Playwright when the static text is thin OR when a
 * screenshot is requested (screenshots require a real browser). Rendering needs
 * `getBrowser`; without it, only static extraction is done.
 */
export async function getPageInfo(
  url: string,
  options: { wantScreenshot?: boolean; forceRender?: boolean; getBrowser?: BrowserProvider } = {},
): Promise<RawPage> {
  const { wantScreenshot = false, forceRender = false, getBrowser } = options;

  try {
    const staticData = await staticPass(url);
    const needsRender =
      !!getBrowser && (forceRender || wantScreenshot || staticData.text.length < THIN_TEXT_CHARS);

    if (needsRender && getBrowser) {
      try {
        const browser = await getBrowser();
        const { extracted, screenshotB64 } = await dynamicPass(url, browser, wantScreenshot);
        // Keep whichever pass produced more readable text.
        const best = extracted.text.length >= staticData.text.length ? extracted : staticData;
        return { url, ...best, screenshotB64, renderedWith: "dynamic" };
      } catch {
        // Browser missing (no `npx playwright install`) or render failed —
        // fall back to the static extraction rather than losing the page.
        return { url, ...staticData, renderedWith: "static" };
      }
    }
    return { url, ...staticData, renderedWith: "static" };
  } catch {
    return emptyPage(url);
  }
}
