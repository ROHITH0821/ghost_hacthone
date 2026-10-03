import { ghostSystem, evidenceText } from "@/lib/ghost-engine/prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

import type { GhostReport } from "@/lib/types";
import { anthropic } from "@/lib/ghost-engine/client";
import { MODEL, STRUCTURED_THINKING } from "@/lib/ghost-engine/config";
import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";

import {
  GAP_DIFF_MARKET_WEAK,
  GAP_DIFF_OWNER_STRONG,
  GAP_MARKET_STRONG,
  GAP_OWNER_MIN_FOR_WEAKER,
  GAP_OWNER_MISSING,
  GAP_WEAKER_DELTA,
} from "./config";
import { FEATURE_BY_ID, FEATURE_TAXONOMY } from "./feature-taxonomy";
import {
  buildMarketExpectations,
  featurePrevalence,
  findMissingCriteria,
  getMarketExpectation,
  marketFeatureScore,
  ownerFeatureScore,
} from "./market-expectations";
import { clampScore } from "./score-utils";
import type {
  GapPriority,
  GapType,
  MarketGap,
  NormalizedSiteFeatures,
} from "./types";
import { MarketGapSchema } from "./types";

const GapNarrativesSchema = z.object({
  gaps: z.array(
    z.object({
      featureId: z.string(),
      gap: z.string().min(3),
      evidence: z.string().min(10),
      impact: z.string().min(10),
      recommendation: z.string().min(10),
      linkedLeakIds: z.array(z.string()).optional(),
    }),
  ),
});

interface GapDraft {
  featureId: string;
  gapType: GapType;
  priority: GapPriority;
  prevalence: number;
  competitorCount: number;
  ownerScore: number;
  marketScore: number;
  scoreDelta: number;
  missingCriteria: string[];
}

function classifyPriority(gapType: GapType, scoreDelta: number, prevalence: number): GapPriority {
  if (gapType === "missing_expected" && prevalence >= 0.75) return "critical";
  if (gapType === "missing_expected" && prevalence >= 0.5) return "high";
  if (gapType === "weaker_than_market" && scoreDelta >= 30) return "high";
  if (gapType === "weaker_than_market" && scoreDelta >= GAP_WEAKER_DELTA) return "high";
  if (gapType === "differentiation_opportunity") return "medium";
  return "medium";
}

function classifyGaps(
  ownerFeatures: NormalizedSiteFeatures,
  market: ReturnType<typeof buildMarketExpectations>,
): GapDraft[] {
  const drafts: GapDraft[] = [];

  for (const def of FEATURE_TAXONOMY) {
    const expectation = getMarketExpectation(market, def.id);
    if (!expectation) continue;

    const ownerScore = ownerFeatureScore(ownerFeatures, def.id);
    const marketScore = marketFeatureScore(expectation);
    const scoreDelta = marketScore - ownerScore;
    const prevalence = featurePrevalence(expectation);
    const missingCriteria = findMissingCriteria(
      ownerFeatures.features[def.id],
      expectation,
    );
    const competitorCount = expectation.competitorCount;

    if (marketScore >= GAP_MARKET_STRONG && ownerScore < GAP_OWNER_MISSING) {
      drafts.push({
        featureId: def.id,
        gapType: "missing_expected",
        priority: classifyPriority("missing_expected", scoreDelta, prevalence),
        prevalence,
        competitorCount,
        ownerScore,
        marketScore,
        scoreDelta,
        missingCriteria,
      });
      continue;
    }

    if (
      scoreDelta >= GAP_WEAKER_DELTA &&
      ownerScore >= GAP_OWNER_MIN_FOR_WEAKER &&
      marketScore >= GAP_OWNER_MISSING
    ) {
      drafts.push({
        featureId: def.id,
        gapType: "weaker_than_market",
        priority: classifyPriority("weaker_than_market", scoreDelta, prevalence),
        prevalence,
        competitorCount,
        ownerScore,
        marketScore,
        scoreDelta,
        missingCriteria,
      });
      continue;
    }

    if (ownerScore >= GAP_DIFF_OWNER_STRONG && marketScore < GAP_DIFF_MARKET_WEAK) {
      drafts.push({
        featureId: def.id,
        gapType: "differentiation_opportunity",
        priority: "medium",
        prevalence,
        competitorCount,
        ownerScore,
        marketScore,
        scoreDelta: ownerScore - marketScore,
        missingCriteria: [],
      });
    }
  }

  const priorityOrder: Record<GapPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return drafts.sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    return b.scoreDelta - a.scoreDelta;
  });
}

function linkLeaks(report: GhostReport, featureId: string): string[] {
  const def = FEATURE_BY_ID.get(featureId);
  if (!def) return [];
  const keywords = [def.label.toLowerCase(), ...def.label.toLowerCase().split(/\s+/)];
  return report.leaks
    .filter((leak) => {
      const hay = `${leak.title} ${leak.whatIsWrong} ${leak.category ?? ""}`.toLowerCase();
      return keywords.some((k) => k.length > 3 && hay.includes(k));
    })
    .map((l) => l.id)
    .slice(0, 3);
}

/** Rule-based score classification + LLM narrative for actionable market gaps. */
export async function generateMarketGaps(input: {
  ownerFeatures: NormalizedSiteFeatures;
  competitorFeatures: NormalizedSiteFeatures[];
  ownerReport: GhostReport;
}): Promise<MarketGap[]> {
  const market = buildMarketExpectations(input.competitorFeatures);
  const drafts = classifyGaps(input.ownerFeatures, market);
  if (drafts.length === 0) return [];

  const response = await parseStructuredWithTimeout("generateMarketGaps", (signal) =>
    anthropic().messages.parse({
      model: MODEL,
      max_tokens: 6000,
      thinking: STRUCTURED_THINKING,
      system: ghostSystem("Market research: gap-analysis", `You write actionable market gap cards for a website owner.
Each gap MUST include all four fields: gap (short title), evidence (quantify market with scores and specific criteria — e.g. "Market averages 78 on pricing; you score 34. Missing: installments, refund policy"), impact (buyer/trust/conversion outcome), recommendation (specific implementable change with placement/count).
Reference criterion names when provided in missingCriteria. Never use vague advice like "consider adding".`),
      messages: [
        {
          role: "user",
          content: evidenceText(`Owner site: ${input.ownerFeatures.siteUrl}
Owner business goal: ${input.ownerReport.businessUnderstanding.primaryGoal}
Target audience: ${input.ownerReport.businessUnderstanding.targetAudience}

Gap drafts (pre-classified with scores):
${JSON.stringify(
  drafts.map((d) => ({
    ...d,
    featureLabel: FEATURE_BY_ID.get(d.featureId)?.label,
    dimension: FEATURE_BY_ID.get(d.featureId)?.dimension,
    marketEvidence: getMarketExpectation(market, d.featureId)?.marketEvidence,
    ownerCriteria: input.ownerFeatures.features[d.featureId]?.criteria,
    marketCriteria: getMarketExpectation(market, d.featureId)?.criteria,
  })),
  null,
  2,
)}

Owner leaks (link when relevant via linkedLeakIds):
${input.ownerReport.leaks.map((l) => `${l.id}: ${l.title}`).join("\n")}`),
        },
      ],
      output_config: { format: zodOutputFormat(GapNarrativesSchema) },
    }, { signal, maxRetries: 0 }),
  );

  const narratives = response.parsed_output?.gaps ?? [];
  const byFeature = new Map(narratives.map((g) => [g.featureId, g]));

  const gaps: MarketGap[] = [];
  for (const draft of drafts) {
    const narrative = byFeature.get(draft.featureId);
    const def = FEATURE_BY_ID.get(draft.featureId);
    if (!def) continue;

    const gapTitle =
      narrative?.gap ??
      (draft.gapType === "differentiation_opportunity"
        ? `Strong ${def.label.toLowerCase()} vs market (${draft.ownerScore} vs ${draft.marketScore})`
        : `Weak ${def.label.toLowerCase()} (${draft.ownerScore} vs market ${draft.marketScore})`);

    const expectation = getMarketExpectation(market, draft.featureId);
    const criteriaNote =
      draft.missingCriteria.length > 0
        ? ` Missing criteria: ${draft.missingCriteria.join(", ")}.`
        : "";
    const fallbackEvidence =
      expectation?.marketEvidence ??
      `Market scores ${draft.marketScore}/100; you score ${draft.ownerScore}/100.${criteriaNote}`;

    const candidate = {
      gap: gapTitle,
      evidence: narrative?.evidence ?? fallbackEvidence,
      impact:
        narrative?.impact ??
        "Buyers compare options side-by-side; a lower score on this dimension increases hesitation before purchase.",
      recommendation:
        narrative?.recommendation ??
        (draft.missingCriteria[0]
          ? `Improve ${draft.missingCriteria[0].toLowerCase()} on your pricing or product page with clear buyer-facing copy.`
          : `Raise your ${def.label.toLowerCase()} score toward market average (${draft.marketScore}).`),
      featureId: draft.featureId,
      dimension: def.dimension,
      gapType: draft.gapType,
      priority: draft.priority,
      prevalence: draft.prevalence,
      competitorCount: draft.competitorCount,
      ownerScore: draft.ownerScore,
      marketScore: draft.marketScore,
      scoreDelta: clampScore(draft.scoreDelta),
      missingCriteria: draft.missingCriteria.length ? draft.missingCriteria : undefined,
      linkedLeakIds:
        narrative?.linkedLeakIds?.length
          ? narrative.linkedLeakIds
          : linkLeaks(input.ownerReport, draft.featureId),
    };

    const parsed = MarketGapSchema.safeParse(candidate);
    if (parsed.success) gaps.push(parsed.data);
  }

  return gaps;
}
