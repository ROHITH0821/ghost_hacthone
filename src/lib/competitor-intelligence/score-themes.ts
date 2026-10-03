import { ghostSystem, evidenceText } from "@/lib/ghost-engine/prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

import { anthropic } from "@/lib/ghost-engine/client";
import { MODEL, STRUCTURED_THINKING } from "@/lib/ghost-engine/config";
import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";

import { COMPETITOR_EXTRACT_MAX_PAGES } from "./config";
import { THEME_GROUPS, type ThemeId } from "./theme-groups";
import type { CompetitorCrawlPage } from "./types";

export type { ThemeScore, SiteThemeScoresLike } from "./theme-score-lookup";
export { themeScoreById } from "./theme-score-lookup";

const THEME_IDS = THEME_GROUPS.map((t) => t.id) as [ThemeId, ...ThemeId[]];

const ThemeScoreItemSchema = z.object({
  themeId: z.enum(THEME_IDS),
  status: z.enum(["observed", "not_observed"]),
  /** 0–100 when observed; must be null when not_observed */
  score: z.number().min(0).max(100).nullable(),
  /** Short quote from crawled text when observed; null when not_observed */
  quote: z.string().nullable(),
  sourceUrl: z.string().optional(),
});

const ThemeScoresResponseSchema = z.object({
  siteName: z.string(),
  themes: z.array(ThemeScoreItemSchema).min(1),
});

export type SiteThemeScores = {
  siteUrl: string;
  siteName: string;
  scoredAt: string;
  themes: Array<z.infer<typeof ThemeScoreItemSchema>>;
};

/** Cap pages for the theme prompt without importing ghost-engine ingest (client-unsafe). */
function selectPagesForThemePrompt<
  T extends { url: string; textExcerpt: string; title?: string },
>(pages: T[], maxPages: number = COMPETITOR_EXTRACT_MAX_PAGES): T[] {
  if (pages.length <= maxPages) return pages;
  const ranked = [...pages].sort((a, b) => {
    const lenA = a.textExcerpt.replace(/\s+/g, " ").trim().length;
    const lenB = b.textExcerpt.replace(/\s+/g, " ").trim().length;
    return lenB - lenA;
  });
  const home = pages.find((p) => {
    try {
      const path = new URL(p.url).pathname.replace(/\/+$/, "") || "/";
      return path === "/";
    } catch {
      return false;
    }
  });
  const selected: T[] = [];
  if (home) selected.push(home);
  for (const p of ranked) {
    if (selected.length >= maxPages) break;
    if (selected.includes(p)) continue;
    selected.push(p);
  }
  return selected;
}

function themePromptList(): string {
  return THEME_GROUPS.map(
    (t) =>
      `- ${t.id}: ${t.title}\n  Why it matters: ${t.whyItMatters}\n  Look for: ${t.features.map((f) => f.featureId).join(", ")}`,
  ).join("\n\n");
}

function normalizeThemeScores(
  siteUrl: string,
  siteName: string,
  raw: z.infer<typeof ThemeScoresResponseSchema> | null | undefined,
  pages: CompetitorCrawlPage[],
): SiteThemeScores {
  const byId = new Map((raw?.themes ?? []).map((t) => [t.themeId, t]));
  const themes: SiteThemeScores["themes"] = THEME_GROUPS.map((g) => {
    const hit = byId.get(g.id);
    if (!hit) {
      return {
        themeId: g.id,
        status: "not_observed" as const,
        score: null,
        quote: null,
      };
    }
    const quote = hit.quote?.trim() || null;
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const source = pages.find(p => (!hit.sourceUrl || p.url === hit.sourceUrl) && quote && normalize(p.textExcerpt.slice(0, 2000)).includes(normalize(quote)));
    const observed =
      Boolean(source) &&
      hit.status === "observed" &&
      hit.score != null &&
      quote != null &&
      quote.length > 0 &&
      !/^not observed/i.test(quote);

    if (!observed) {
      return {
        themeId: g.id,
        status: "not_observed" as const,
        score: null,
        quote: null,
        sourceUrl: undefined,
      };
    }

    return {
      themeId: g.id,
      status: "observed" as const,
      score: Math.round(hit.score!),
      quote: quote.slice(0, 220),
      sourceUrl: source?.url,
    };
  });

  return {
    siteUrl,
    siteName: raw?.siteName?.trim() || siteName,
    scoredAt: new Date().toISOString(),
    themes,
  };
}

/** LLM scores the 7 business themes from crawled pages — quote required or not_observed. */
export async function scoreThemesFromPages(input: {
  siteUrl: string;
  siteName: string;
  pages: CompetitorCrawlPage[];
}): Promise<SiteThemeScores> {
  const pagesForPrompt = selectPagesForThemePrompt(input.pages);

  const response = await parseStructuredWithTimeout("scoreThemesFromPages", (signal) =>
    anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      thinking: STRUCTURED_THINKING,
      system: ghostSystem("Market research: score-themes", `You score a website on 7 business themes using ONLY the crawled page text provided.

For EACH theme id, return:
- status "observed" ONLY when the theme signal is clearly present in the text — then score 0-100 AND a short exact quote copied from that text
- status "not_observed" when the signal is absent — then score MUST be null and quote MUST be null

Scoring guide when observed:
- 0–30: present but weak, buried, or incomplete
- 35–65: partial / mixed
- 70–100: clear, prominent, buyer-ready

Rules:
- Never invent pages, prices, or policies not in the text
- Never use status observed without a real quote from the pages
- Never use score 0 as a stand-in for "not seen" — use not_observed instead
- Score every theme id listed`),
      messages: [
        {
          role: "user",
          content: evidenceText(`Site: ${input.siteName} (${input.siteUrl})

Themes:
${themePromptList()}

Crawled pages:
${pagesForPrompt
  .map(
    (p) =>
      `URL: ${p.url}\nTitle: ${p.title}\nMeta: ${p.metaDescription}\nText:\n${p.textExcerpt.slice(0, 2000)}`,
  )
  .join("\n\n---\n\n")}

Return scores for ALL theme ids.`),
        },
      ],
      output_config: { format: zodOutputFormat(ThemeScoresResponseSchema) },
    }, { signal, maxRetries: 0 }),
  );

  return normalizeThemeScores(
    input.siteUrl,
    input.siteName,
    response.parsed_output,
    pagesForPrompt,
  );
}
