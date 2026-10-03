import { timeStage } from "@/lib/missions/execution-context";
import { crawlSite, type CrawlOptions, type RawCrawl } from "./crawl";
import { buildContextPack } from "./buildContextPack";
import type { ContextPack } from "../types";
import type { CrawlSignals } from "../scoring";

export type { RawCrawl } from "./crawl";
export type { RawPage } from "./extract";
export { crawlSite } from "./crawl";
export { buildContextPack } from "./buildContextPack";

/**
 * Judge whether the crawl actually captured meaningful content. A JS-rendered
 * site we couldn't read (or one that blocked us) yields near-empty pages — and
 * we must NOT then present a confident "your business is broken" audit. When
 * `lowConfidence` is true, the report discloses that results may be incomplete.
 */
export function assessCrawl(crawl: RawCrawl): { lowConfidence: boolean } {
  const richPages = crawl.pages.filter(
    (p) => p.text.replace(/\s+/g, " ").trim().length > 800,
  ).length;
  return { lowConfidence: crawl.pages.length > 0 && richPages === 0 };
}

export function buildCrawlSignals(crawl: RawCrawl): CrawlSignals {
  const richPageCount = crawl.pages.filter(
    (p) => p.text.replace(/\s+/g, " ").trim().length > 800,
  ).length;
  const screenshotCount = crawl.pages.filter((p) => !!p.screenshotB64).length;
  const dynamicRenderCount = crawl.pages.filter((p) => p.renderedWith === "dynamic").length;
  const { lowConfidence } = assessCrawl(crawl);

  return {
    pageCount: crawl.pages.length,
    richPageCount,
    screenshotCount,
    dynamicRenderCount,
    lowConfidence,
  };
}

export interface IngestEvents {
  /** Fired after the crawl, before synthesis. */
  onCrawled?: (crawl: RawCrawl) => void | Promise<void>;
}

/**
 * Stage 1 → 1.4: turn a URL into a Context Pack the engine can audit.
 * crawl the site → synthesize the customer-eyed Context Pack.
 */
export async function ingestUrl(
  url: string,
  events: IngestEvents = {},
  options: CrawlOptions = {},
): Promise<ContextPack> {
  const crawl = await timeStage("crawl", () => crawlSite(url, options));
  await events.onCrawled?.(crawl);
  return timeStage("context_synthesis", () => buildContextPack(crawl));
}
