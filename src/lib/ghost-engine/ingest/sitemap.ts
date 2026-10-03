import * as cheerio from "cheerio";

import { CRAWL_MAX_DISCOVERED_URLS, CRAWL_MAX_SITEMAP_INDEXES, FETCH_TIMEOUT_MS } from "../config";
import { getOrigin, isCrawlableUrl, isSameOrigin, normalizePageUrl } from "./urlUtils";
import { USER_AGENT } from "./extract";

/**
 * Sitemap discovery — robots.txt Sitemap: directives plus common fallback paths,
 * walking child sitemap indexes until a file/URL cap. Ported from the takeover extractor.
 */

const FALLBACK_SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function discoverSitemapCandidates(rootUrl: string): Promise<string[]> {
  const origin = getOrigin(rootUrl);
  const candidates = new Set<string>();

  const robotsTxt = await fetchText(`${origin}/robots.txt`);
  if (robotsTxt) {
    for (const line of robotsTxt.split("\n")) {
      const match = line.match(/^\s*sitemap:\s*(.+)\s*$/i);
      if (match?.[1]) candidates.add(match[1].trim());
    }
  }
  for (const path of FALLBACK_SITEMAP_PATHS) candidates.add(`${origin}${path}`);

  return Array.from(candidates);
}

function parseSitemapXml(
  xml: string,
  origin: string,
): { pageUrls: string[]; childSitemaps: string[] } {
  const $ = cheerio.load(xml, { xml: true });
  const pageUrls: string[] = [];
  const childSitemaps: string[] = [];

  $("sitemap loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) childSitemaps.push(loc);
  });
  $("url loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) pageUrls.push(loc);
  });

  const filteredPages = pageUrls.filter((u) => isSameOrigin(u, origin) && isCrawlableUrl(u));
  return { pageUrls: filteredPages, childSitemaps };
}

async function parseSitemap(
  sitemapUrl: string,
  origin: string,
  visited: Set<string>,
  collected: Set<string>,
  limits: { maxFiles: number; maxUrls: number },
): Promise<void> {
  if (visited.has(sitemapUrl)) return;
  if (visited.size >= limits.maxFiles) return;
  if (collected.size >= limits.maxUrls) return;
  visited.add(sitemapUrl);

  const xml = await fetchText(sitemapUrl);
  if (!xml) return;

  const { pageUrls, childSitemaps } = parseSitemapXml(xml, origin);
  for (const loc of pageUrls) {
    if (collected.size >= limits.maxUrls) return;
    try {
      collected.add(normalizePageUrl(loc));
    } catch {
      // skip invalid loc
    }
  }
  for (const child of childSitemaps) {
    if (visited.size >= limits.maxFiles) break;
    if (collected.size >= limits.maxUrls) break;
    await parseSitemap(child, origin, visited, collected, limits);
  }
}

export async function discoverSitemapUrls(rootUrl: string): Promise<string[]> {
  try {
    const origin = getOrigin(rootUrl);
    const candidates = await discoverSitemapCandidates(rootUrl);
    const visited = new Set<string>();
    const urlSet = new Set<string>();
    const limits = {
      maxFiles: CRAWL_MAX_SITEMAP_INDEXES,
      maxUrls: CRAWL_MAX_DISCOVERED_URLS,
    };

    for (const candidate of candidates) {
      if (visited.size >= limits.maxFiles || urlSet.size >= limits.maxUrls) break;
      await parseSitemap(candidate, origin, visited, urlSet, limits);
    }
    return Array.from(urlSet);
  } catch {
    return [];
  }
}
