/**
 * Central tunables. One place for models, token budgets, and concurrency so the
 * cost/quality knobs aren't scattered across the pipeline.
 *
 * Keep this module free of Node built-ins (`node:path`, fs, etc.). Client
 * components import competitor-intel helpers that re-export `intEnv` from here;
 * a Node-only import at the top level breaks the Vercel/webpack client build.
 */

/**
 * Parse an integer env var, falling back to `fallback` when unset, blank, or not
 * a finite number — so a stray `GHOST_MAX_FIXES=abc` can't turn into NaN and
 * silently break a loop.
 */
export function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Personas + aggregation. Claude Sonnet 5 — drop-in for Sonnet 4.6 with stronger
 * agentic/coding performance. Override with GHOST_MODEL.
 */
export const MODEL = process.env.GHOST_MODEL ?? "claude-sonnet-5";

/**
 * Sonnet 5 turns adaptive thinking on by default. Thinking tokens count toward
 * `max_tokens` and can starve structured JSON (empty text + stop_reason=max_tokens).
 * Disable thinking on all zod/parse extraction calls.
 */
export const STRUCTURED_THINKING = { type: "disabled" as const };

/**
 * Flow analysis (Stage 1.5) is a lighter structural task and can run on a
 * cheaper model. Defaults to MODEL; set GHOST_FLOW_MODEL=claude-haiku-4-5 to
 * shave cost/latency further.
 */
export const FLOW_MODEL = process.env.GHOST_FLOW_MODEL ?? MODEL;

// Output-token budgets per stage.
/** Sonnet 5 structured flow lists need more headroom than 4.6; truncation → zero flows. */
export const MAX_TOKENS_FLOWS = Math.max(2500, intEnv("GHOST_MAX_TOKENS_FLOWS", 8000));
export const MAX_TOKENS_PERSONA = Math.max(1000, intEnv("GHOST_MAX_TOKENS_PERSONA", 4000));
export const MAX_TOKENS_REPORT = Math.max(4000, intEnv("GHOST_MAX_TOKENS_REPORT", 16000));
export const MAX_TOKENS_FIX = Math.max(800, intEnv("GHOST_MAX_TOKENS_FIX", 3000));
export const MAX_TOKENS_CONTEXT_PACK = Math.max(2000, intEnv("GHOST_MAX_TOKENS_CONTEXT", 8000));

/**
 * How many top leaks to generate fixes for (Stage 4). Ranked, so this takes the
 * worst N. Kept small by default — fixes are the last, low-volume step, and this
 * bounds their cost directly. Override with GHOST_MAX_FIXES.
 */
export const MAX_FIXES = Math.max(1, intEnv("GHOST_MAX_FIXES", 3));

// --- Ingest (Stage 1 → 1.4) -------------------------------------------------

/**
 * Safety ceiling of pages to fetch per site (after journey ranking).
 * Discovery walks the whole site; this only truncates runaway catalogs.
 * Env: GHOST_CRAWL_MAX_PAGES (default 250).
 */
export const CRAWL_MAX_PAGES = Math.max(1, intEnv("GHOST_CRAWL_MAX_PAGES", 250));
/** Max sitemap-index / child-sitemap files to fetch. Env: GHOST_CRAWL_SITEMAP_INDEXES. */
export const CRAWL_MAX_SITEMAP_INDEXES = Math.max(1, intEnv("GHOST_CRAWL_SITEMAP_INDEXES", 50));
/** Cap on unique URLs collected from sitemaps + BFS (memory guard). Env: GHOST_CRAWL_DISCOVER_URLS. */
export const CRAWL_MAX_DISCOVERED_URLS = Math.max(
  CRAWL_MAX_PAGES,
  intEnv("GHOST_CRAWL_DISCOVER_URLS", 2000),
);
/** How many top journey pages get a screenshot (for visual_notes). */
export const CRAWL_SCREENSHOT_TOP_K = Math.max(0, intEnv("GHOST_CRAWL_SCREENSHOTS", 3));
/** How many pages to fetch in parallel while crawling. */
export const CRAWL_CONCURRENCY = Math.max(1, intEnv("GHOST_CRAWL_CONCURRENCY", 4));
/** Per-page text sent to the synthesis call for top journey pages. */
export const CONTEXT_PACK_TEXT_CAP = Math.max(500, intEnv("GHOST_TEXT_CAP", 4000));
/** Shorter excerpts for long-tail pages in the Context Pack payload. */
export const CONTEXT_PACK_TAIL_TEXT_CAP = Math.max(200, intEnv("GHOST_TEXT_CAP_TAIL", 800));
/** How many highest-scoring journey pages get the full text cap. */
export const CONTEXT_PACK_FULL_PAGES = Math.max(1, intEnv("GHOST_CONTEXT_FULL_PAGES", 20));
/** Cache crawl results on disk under .cache/ locally. Disabled on Vercel (ephemeral FS). Set GHOST_CRAWL_CACHE=0 to disable. */
export const CRAWL_CACHE =
  process.env.GHOST_CRAWL_CACHE !== "0" && !process.env.VERCEL;
/** Per-request timeout for static fetches, so a hanging server can't stall a crawl. */
export const FETCH_TIMEOUT_MS = Math.max(1000, intEnv("GHOST_FETCH_TIMEOUT_MS", 15000));

// --- Branding / report ------------------------------------------------------

/** Brand shown on the PDF report. Override with GHOST_BRAND for white-labeling. */
export const REPORT_BRAND = process.env.GHOST_BRAND ?? "Web Aura India";
/** Generate the PDF one-pager after an audit. Set GHOST_PDF=0 to skip. */
export const REPORT_PDF = process.env.GHOST_PDF !== "0";

/** Bounded by default so a large site cannot launch 100 model calls together. */
export const SWARM_CONCURRENCY = Math.min(12, Math.max(1, Math.floor(intEnv("GHOST_SWARM_CONCURRENCY", 6))));
