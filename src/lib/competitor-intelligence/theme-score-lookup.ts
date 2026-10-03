import type { ThemeId } from "./theme-groups";

/** Client-safe theme score shape (no LLM / Node imports). */
export type ThemeScore = {
  themeId: ThemeId | string;
  status: "observed" | "not_observed";
  score: number | null;
  quote: string | null;
  sourceUrl?: string;
};

export type SiteThemeScoresLike = {
  siteUrl: string;
  siteName: string;
  scoredAt: string;
  themes: ThemeScore[];
};

export function themeScoreById(
  site: SiteThemeScoresLike | null | undefined,
  themeId: ThemeId,
): ThemeScore | undefined {
  const hit = site?.themes.find((t) => t.themeId === themeId);
  if (!hit) return undefined;
  return {
    themeId,
    status: hit.status,
    score: hit.score,
    quote: hit.quote,
    sourceUrl: hit.sourceUrl,
  };
}
