import { intEnv } from "@/lib/ghost-engine/config";

/** Wall-clock budget for competitor intelligence (own finalize invocation). */
export const COMPETITOR_INTEL_BUDGET_MS = Math.min(
  400_000,
  Math.max(30_000, intEnv("GHOST_COMPETITOR_INTEL_BUDGET_MS", 240_000)),
);

/** Reserved for Playwright PDF generation + Supabase upload during finalize. */
export const PDF_BUDGET_MS = Math.max(30_000, intEnv("GHOST_PDF_BUDGET_MS", 60_000));

/** Headroom under finalize route maxDuration (800s). */
export const FINALIZE_WALL_MS = 780_000;

export const FINALIZE_CRON_LIMIT = Math.max(
  1,
  Math.min(20, intEnv("FINALIZE_CRON_LIMIT", 5)),
);
