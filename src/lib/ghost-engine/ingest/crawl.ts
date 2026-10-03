import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { type Browser, chromium } from "playwright";

import {
  CRAWL_CACHE,
  CRAWL_CONCURRENCY,
  CRAWL_MAX_DISCOVERED_URLS,
  CRAWL_MAX_PAGES,
  CRAWL_SCREENSHOT_TOP_K,
} from "../config";
import { mapWithConcurrency } from "../util";
import { getPageInfo, type RawPage } from "./extract";
import { discoverSitemapUrls } from "./sitemap";
import { journeyPathScore, normalizePageUrlForDedupe, prioritizeUrls } from "./prioritize";
import { assertSafeUrl, normalizeInputUrl, normalizePageUrl } from "./urlUtils";

export interface RawCrawl {
  rootUrl: string;
  pages: RawPage[];
  discoveredFrom: { sitemap: number; links: number };
  truncated: boolean;
  /** True when adaptive crawl stopped early after enough marketing evidence. */
  evidenceSufficient?: boolean;
}

export interface CrawlOptions {
  maxPages?: number;
  screenshotTopK?: number;
  useCache?: boolean;
  /**
   * When set, fetch homepage then remaining prioritized URLs one-by-one,
   * stopping early when the predicate returns true (adaptive competitor crawl).
   */
  adaptiveStop?: (pages: RawPage[]) => boolean;
}

const CACHE_DIR = join(".cache", "crawl");
// v5: full-site BFS crawl (sitemap + per-page links), higher safety ceilings
const CACHE_VERSION = "v5";

function cachePath(key: string): string {
  return join(CACHE_DIR, `${createHash("md5").update(key).digest("hex")}.json`);
}

async function readCache(key: string): Promise<RawCrawl | null> {
  try {
    return JSON.parse(await readFile(cachePath(key), "utf-8")) as RawCrawl;
  } catch {
    return null;
  }
}

async function writeCache(key: string, crawl: RawCrawl): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath(key), JSON.stringify(crawl), "utf-8");
  } catch {
    // cache is best-effort
  }
}

function isDuplicateBody(pages: RawPage[], page: RawPage): boolean {
  const body = page.text.replace(/\s+/g, " ").trim().slice(0, 800);
  if (body.length <= 200) return false;
  return pages.some((p) => p.text.replace(/\s+/g, " ").trim().slice(0, 800) === body);
}

function acceptPage(pages: RawPage[], page: RawPage): boolean {
  if (!(page.title || page.text)) return false;
  if (isDuplicateBody(pages, page)) return false;
  pages.push(page);
  return true;
}

/**
 * Crawl a business site into raw pages ready for Context Pack synthesis.
 * Discovers URLs from sitemaps and BFS of same-origin links, ranks journey
 * pages first, and fetches until the queue is empty or the safety ceiling.
 */
export async function crawlSite(url: string, options: CrawlOptions = {}): Promise<RawCrawl> {
  const rootUrl = normalizeInputUrl(url);
  const maxPages = options.maxPages ?? CRAWL_MAX_PAGES;
  const screenshotTopK = options.screenshotTopK ?? CRAWL_SCREENSHOT_TOP_K;
  const useCache = options.useCache ?? CRAWL_CACHE;
  const adaptiveStop = options.adaptiveStop;
  const cacheKey = `${CACHE_VERSION}|${rootUrl}|${maxPages}|${screenshotTopK}|${adaptiveStop ? "adaptive" : "full"}`;

  if (useCache) {
    const cached = await readCache(cacheKey);
    if (cached) return cached;
  }

  await assertSafeUrl(rootUrl);

  const state: { browser: Browser | null } = { browser: null };
  const getBrowser = async (): Promise<Browser> =>
    (state.browser ??= await chromium.launch({ args: ["--no-sandbox"] }));

  try {
    const sitemapUrls = await discoverSitemapUrls(rootUrl);

    const root = await getPageInfo(rootUrl, {
      wantScreenshot: screenshotTopK > 0,
      getBrowser,
    });
    const isSpa = root.renderedWith === "dynamic";

    const pages: RawPage[] = [];
    acceptPage(pages, root);

    const queuedKeys = new Set<string>([normalizePageUrlForDedupe(rootUrl)]);
    const pending: string[] = [];
    let linkDiscoveries = 0;
    const sitemapSet = new Set(sitemapUrls);

    const consider = (raw: string, fromLink: boolean) => {
      if (queuedKeys.size >= CRAWL_MAX_DISCOVERED_URLS) return;
      let pageUrl: string;
      try {
        pageUrl = normalizePageUrl(raw);
      } catch {
        return;
      }
      const key = normalizePageUrlForDedupe(pageUrl);
      if (queuedKeys.has(key)) return;
      if (journeyPathScore(pageUrl) < 0) return;
      queuedKeys.add(key);
      pending.push(pageUrl);
      if (fromLink) linkDiscoveries += 1;
    };

    // Rank sitemap + homepage links as sort order only (no slice).
    const seeded = prioritizeUrls(rootUrl, [...sitemapUrls, ...(root.discoveredLinks ?? [])]);
    for (const u of seeded.slice(1)) {
      consider(u, !sitemapSet.has(u));
    }

    const rankPending = () => {
      pending.sort((a, b) => journeyPathScore(b) - journeyPathScore(a));
    };
    rankPending();

    const fetchOne = (pageUrl: string, screenshotIndex: number) =>
      getPageInfo(pageUrl, {
        wantScreenshot: screenshotIndex < screenshotTopK,
        forceRender: isSpa,
        getBrowser,
      });

    let evidenceSufficient = false;

    if (adaptiveStop) {
      evidenceSufficient = pages.length > 0 && adaptiveStop(pages);
      while (pages.length < maxPages && pending.length > 0 && !evidenceSufficient) {
        const next = pending.shift()!;
        try {
          const page = await fetchOne(next, pages.length);
          if (acceptPage(pages, page)) {
            for (const u of page.discoveredLinks ?? []) consider(u, true);
            rankPending();
            evidenceSufficient = adaptiveStop(pages);
          }
        } catch {
          // skip failed page
        }
      }
    } else {
      while (pages.length < maxPages && pending.length > 0) {
        const batchSize = Math.min(CRAWL_CONCURRENCY, maxPages - pages.length, pending.length);
        const batch = pending.splice(0, batchSize);
        const startCount = pages.length;
        const settled = await mapWithConcurrency(batch, CRAWL_CONCURRENCY, (pageUrl, i) =>
          fetchOne(pageUrl, startCount + i),
        );
        for (const result of settled) {
          if (result.status !== "fulfilled") continue;
          if (pages.length >= maxPages) break;
          if (acceptPage(pages, result.value)) {
            for (const u of result.value.discoveredLinks ?? []) consider(u, true);
          }
        }
        rankPending();
      }
    }

    const truncated = adaptiveStop
      ? pages.length >= maxPages && !evidenceSufficient
      : pending.length > 0;

    const crawl: RawCrawl = {
      rootUrl,
      pages,
      discoveredFrom: { sitemap: sitemapUrls.length, links: linkDiscoveries },
      truncated,
      ...(adaptiveStop ? { evidenceSufficient } : {}),
    };

    if (useCache && pages.length > 0) await writeCache(cacheKey, crawl);
    return crawl;
  } finally {
    await state.browser?.close();
  }
}
