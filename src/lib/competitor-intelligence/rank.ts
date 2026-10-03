import { ghostSystem, evidenceText } from "@/lib/ghost-engine/prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

import type { ContextPack } from "@/lib/ghost-engine/types";
import { anthropic } from "@/lib/ghost-engine/client";
import { MODEL, STRUCTURED_THINKING } from "@/lib/ghost-engine/config";
import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";
import { extractDomain } from "@/lib/utils";

import { COMPETITOR_MAX } from "./config";
import type { CompetitorCandidate } from "./types";

const RankedCompetitorsSchema = z.object({
  ranked: z.array(
    z.object({
      url: z.string(),
      relevanceScore: z.number().min(0).max(100),
      selectionReason: z.string(),
      reject: z.boolean().optional(),
      rejectReason: z.string().optional(),
    }),
  ),
});

/** Rank and filter candidates; pick the smallest useful competitor set. */
export async function rankCompetitors(input: {
  ownerDomain: string;
  contextPack: ContextPack;
  candidates: CompetitorCandidate[];
}): Promise<CompetitorCandidate[]> {
  if (input.candidates.length === 0) return [];

  const location = input.contextPack.business.location?.trim() || "unknown";
  const response = await parseStructuredWithTimeout("rankCompetitors", (signal) =>
    anthropic().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      thinking: STRUCTURED_THINKING,
      system: ghostSystem("Market research: rank", `You rank direct competitors for a market comparison audit.
Score relevance 0-100. Reject directories, news articles, Wikipedia, marketplaces, and the owner's own site.
Prefer businesses a buyer would realistically compare side-by-side.

Geography rules (strict):
1. Prefer competitors in the SAME country / market as the owner (location provided).
2. Only keep abroad / international competitors if there are not enough strong same-country options.
3. When choosing among equals, rank same-country rivals higher than foreign ones.

Return at most ${COMPETITOR_MAX} non-rejected competitors, ordered by relevance.`),
      messages: [
        {
          role: "user",
          content: evidenceText(`Owner: ${input.ownerDomain}
Owner location / country (prefer competitors here): ${location}
Business: ${JSON.stringify(input.contextPack.business)}
Candidates:
${JSON.stringify(input.candidates)}

Rank and filter. Mark reject=true for unsuitable URLs.
Prefer same-country competitors for "${location}"; only keep abroad rivals if the local set is too weak.`),
        },
      ],
      output_config: { format: zodOutputFormat(RankedCompetitorsSchema) },
    }, { signal, maxRetries: 0 }),
  );

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Competitor ranking returned no structured output");

  const byUrl = new Map(input.candidates.map((c) => [normalizeOrigin(c.url), c]));
  const ranked: CompetitorCandidate[] = [];

  for (const item of parsed.ranked) {
    const key = normalizeOrigin(item.url);
    const base = byUrl.get(key);
    if (!base) continue;

    if (item.reject) {
      ranked.push({
        ...base,
        rejected: true,
        rejectReason: item.rejectReason,
        relevanceScore: item.relevanceScore,
        selectionReason: item.selectionReason,
      });
      continue;
    }

    ranked.push({
      ...base,
      relevanceScore: item.relevanceScore,
      selectionReason: item.selectionReason,
      rejected: false,
    });
  }

  const selected = ranked.filter((c) => !c.rejected).slice(0, COMPETITOR_MAX);
  return selected;
}

function normalizeOrigin(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).origin;
  } catch {
    return url;
  }
}

export function candidateDisplayName(candidate: CompetitorCandidate): string {
  return candidate.name || extractDomain(candidate.url);
}
