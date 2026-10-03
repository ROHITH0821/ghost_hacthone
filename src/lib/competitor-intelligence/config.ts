import { intEnv } from "@/lib/ghost-engine/config";

/** Max competitors to crawl after ranking. */
export const COMPETITOR_MAX = Math.max(1, Math.min(6, intEnv("GHOST_COMPETITOR_MAX", 4)));

/**
 * Safety ceiling of pages per competitor site. Discovery + BFS fetch until
 * the queue is empty or this cap. Env: GHOST_COMPETITOR_PAGES (default 100).
 * LLM feature-extract still subsets via COMPETITOR_EXTRACT_MAX_PAGES.
 */
export const COMPETITOR_PAGES_PER_SITE = Math.max(
  1,
  Math.min(500, intEnv("GHOST_COMPETITOR_PAGES", 100)),
);

/**
 * Fraction of applicable taxonomy features that need a proxy signal
 * for pack coverage metrics. Env: GHOST_COMPETITOR_COVERAGE_STOP (0–1, default 0.70).
 */
export const COMPETITOR_COVERAGE_STOP = Math.max(
  0.4,
  Math.min(0.95, Number(process.env.GHOST_COMPETITOR_COVERAGE_STOP ?? "0.70") || 0.7),
);

/** Minimum rich pages before pack coverage is marked sufficient. */
export const COMPETITOR_MIN_RICH_PAGES_FOR_STOP = Math.max(
  2,
  Math.min(8, intEnv("GHOST_COMPETITOR_MIN_RICH_PAGES", 3)),
);

/** Pages sent to the feature-extract LLM (token guard). */
export const COMPETITOR_EXTRACT_MAX_PAGES = Math.max(
  1,
  Math.min(15, intEnv("GHOST_COMPETITOR_EXTRACT_PAGES", 8)),
);

/** Text excerpt cap stored per page in crawl packs. */
export const CRAWL_PACK_TEXT_EXCERPT = Math.max(
  500,
  intEnv("GHOST_COMPETITOR_TEXT_EXCERPT", 2500),
);

/** Tavily web search — optional; LLM + hints used when unset. */
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim() || "";

export const COMPETITOR_SEARCH_ENABLED = process.env.GHOST_COMPETITOR_SEARCH !== "0";

/** Gap classification thresholds (taxonomy v2 numeric scores). */
export const GAP_MARKET_STRONG = 55;
export const GAP_OWNER_MISSING = 25;
export const GAP_WEAKER_DELTA = 20;
export const GAP_OWNER_MIN_FOR_WEAKER = 25;
export const GAP_DIFF_OWNER_STRONG = 65;
export const GAP_DIFF_MARKET_WEAK = 40;
export const CRITERION_PREVALENCE_THRESHOLD = 0.5;
export const CRITERION_OWNER_WEAK = 40;
export const CRITERION_PRESENT_THRESHOLD = 50;

/** Post-extract real coverage bands for crawlQuality. */
export const CRAWL_QUALITY_GOOD_COVERAGE = 0.85;
export const CRAWL_QUALITY_PARTIAL_COVERAGE = 0.5;

/** Share of features that are filler/absent before extract is marked low-confidence. */
export const EXTRACT_LOW_CONFIDENCE_ABSENT_RATIO = 0.85;
