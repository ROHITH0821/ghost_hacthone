import { ghostSystem, evidenceText } from "@/lib/ghost-engine/prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

import type { ContextPack } from "@/lib/ghost-engine/types";
import { anthropic } from "@/lib/ghost-engine/client";
import { MODEL, STRUCTURED_THINKING } from "@/lib/ghost-engine/config";
import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import { extractDomain } from "@/lib/utils";

import { COMPETITOR_SEARCH_ENABLED, TAVILY_API_KEY } from "./config";
import type { CompetitorCandidate } from "./types";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

const LlmCompetitorSuggestionsSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        reason: z.string(),
      }),
    )
    .max(8),
});

function normalizeUrl(input: string, ownerDomain: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    const domain = extractDomain(url.href);
    if (!domain || domain === ownerDomain) return null;
    if (/^(google|facebook|instagram|youtube|linkedin|twitter|x)\./i.test(domain)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Parse URLs and domains from free-text competitor hints. */
export function parseCompetitorHints(hints: string | undefined, ownerDomain: string): SearchResult[] {
  if (!hints?.trim()) return [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const urlPattern = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+(?:\/[^\s,;)"]*)?/gi;
  for (const match of hints.matchAll(urlPattern)) {
    const normalized = normalizeUrl(match[0], ownerDomain);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push({
      url: normalized,
      title: extractDomain(normalized),
      snippet: "Provided by owner as a competitor hint",
    });
  }

  return results;
}

async function searchTavily(
  query: string,
): Promise<{ results: SearchResult[]; failed: boolean }> {
  if (!TAVILY_API_KEY) return { results: [], failed: false };

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 8,
        include_domains: [],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(
        `[tavily] search failed status=${response.status} query=${JSON.stringify(query)}`,
      );
      return { results: [], failed: true };
    }

    const data = (await response.json()) as {
      results?: Array<{ url?: string; title?: string; content?: string }>;
    };

    const results = (data.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        url: r.url!,
        title: r.title ?? r.url!,
        snippet: (r.content ?? "").slice(0, 300),
      }));

    return { results, failed: false };
  } catch (error) {
    console.error("[tavily] search error:", error);
    return { results: [], failed: true };
  }
}

async function suggestCompetitorsWithLlm(
  ownerDomain: string,
  contextPack: ContextPack,
  hints?: string,
): Promise<SearchResult[]> {
  const location = contextPack.business.location?.trim() || "unknown";
  const response = await parseStructuredWithTimeout(
    "suggestCompetitorsWithLlm",
    (signal) =>
      anthropic().messages.parse({
        model: MODEL,
        max_tokens: 1500,
        thinking: STRUCTURED_THINKING,
        system: ghostSystem("Market research: search", `You identify direct competitors for a small business website comparison.
Return real business websites (not directories, marketplaces, or social profiles) that a buyer would consider alongside the owner site.
Exclude aggregators (Justdial, IndiaMART, Yelp) unless the business genuinely sells only through them.

Geography rules (strict):
1. Prefer competitors in the SAME country / market as the owner (use the provided location/geography).
2. Only suggest abroad / international competitors if you cannot name enough credible same-country rivals.
3. When you must go abroad, say so briefly in the reason and still prefer the closest markets.

Return empty array if you cannot name defensible competitors.`),
        messages: [
          {
            role: "user",
            content: evidenceText(`Owner domain: ${ownerDomain}
Owner location / country (prefer competitors here): ${location}
Business context:
${JSON.stringify(contextPack.business)}
Pages summary: ${contextPack.pages.map((p) => p.title).join(", ")}
Owner hints: ${hints ?? "none"}

Suggest up to 5 direct competitor homepages with https URLs.
Prioritize same-country competitors for "${location}". Only include abroad rivals if same-country options are insufficient.`),
          },
        ],
        output_config: { format: zodOutputFormat(LlmCompetitorSuggestionsSchema) },
      }, { signal, maxRetries: 0 }),
  );

  const parsed = response.parsed_output;
  if (!parsed) return [];

  return parsed.competitors
    .map((c) => {
      const normalized = normalizeUrl(c.url, ownerDomain);
      if (!normalized) return null;
      return {
        url: normalized,
        title: c.name,
        snippet: c.reason,
      };
    })
    .filter((r): r is SearchResult => r !== null);
}

/** Local-market queries first (same city/region/country as owner). */
export function buildSearchQueries(contextPack: ContextPack, hints?: string): string[] {
  const { name, type, location } = contextPack.business;
  const place = location?.trim() || "";
  const queries = place
    ? [
        `${type} ${place} similar to ${name}`,
        `best ${type} in ${place}`,
        `${name} competitors ${place}`,
        `${type} companies ${place}`,
      ]
    : [
        `${type} similar to ${name}`,
        `best ${type}`,
        `${name} competitors`,
      ];
  if (hints?.trim()) {
    queries.push(`${type} like ${hints.split(/[,;\n]/)[0]?.trim() ?? hints} ${place}`.trim());
  }
  return queries.slice(0, 4);
}

/** Broader / international queries — only used when local discovery is thin. */
export function buildAbroadSearchQueries(contextPack: ContextPack): string[] {
  const { name, type, location } = contextPack.business;
  const place = location?.trim();
  return [
    `best ${type} worldwide similar to ${name}`,
    `top international ${type} competitors`,
    place ? `${type} alternatives to ${name} outside ${place}` : `${type} alternatives to ${name}`,
  ].slice(0, 2);
}

/** Discover competitor URL candidates via hints, web search, and LLM fallback. */
export async function discoverCompetitorCandidates(input: {
  ownerDomain: string;
  contextPack: ContextPack;
  competitorHints?: string;
}): Promise<{
  queries: string[];
  candidates: CompetitorCandidate[];
  sourcesUsed: string[];
  limitations: string[];
}> {
  const sourcesUsed: string[] = [];
  const limitations: string[] = [];
  const seen = new Set<string>();
  const candidates: CompetitorCandidate[] = [];

  function addCandidate(result: SearchResult, source: CompetitorCandidate["source"]) {
    const normalized = normalizeUrl(result.url, input.ownerDomain);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push({
      url: normalized,
      name: result.title || extractDomain(normalized),
      source,
      snippet: result.snippet,
    });
  }

  const hintResults = parseCompetitorHints(input.competitorHints, input.ownerDomain);
  if (hintResults.length) {
    sourcesUsed.push("owner_hints");
    for (const r of hintResults) addCandidate(r, "hint");
  }

  const localQueries = buildSearchQueries(input.contextPack, input.competitorHints);
  const queries = [...localQueries];

  if (COMPETITOR_SEARCH_ENABLED && TAVILY_API_KEY) {
    sourcesUsed.push("tavily");
    let tavilyFailed = false;
    let tavilyHitCount = 0;
    for (const query of localQueries.slice(0, 2)) {
      const { results, failed } = await searchTavily(query);
      if (failed) tavilyFailed = true;
      tavilyHitCount += results.length;
      for (const r of results) addCandidate(r, "search");
    }
    if (tavilyFailed && tavilyHitCount === 0) {
      limitations.push(
        "Web search unavailable — using LLM competitor suggestions only",
      );
    }
  }

  if (candidates.length < 2) {
    sourcesUsed.push("llm_suggestions");
    const llmResults = await suggestCompetitorsWithLlm(
      input.ownerDomain,
      input.contextPack,
      input.competitorHints,
    );
    for (const r of llmResults) addCandidate(r, "llm");
  }

  // Same-country / local set still thin → broaden abroad.
  if (candidates.length < 2 && COMPETITOR_SEARCH_ENABLED && TAVILY_API_KEY) {
    const abroadQueries = buildAbroadSearchQueries(input.contextPack);
    queries.push(...abroadQueries);
    sourcesUsed.push("tavily_abroad");
    limitations.push(
      "Few same-market competitors found — expanded search abroad",
    );
    for (const query of abroadQueries) {
      const { results } = await searchTavily(query);
      for (const r of results) addCandidate(r, "search");
    }
  }

  return { queries, candidates, sourcesUsed, limitations };
}
