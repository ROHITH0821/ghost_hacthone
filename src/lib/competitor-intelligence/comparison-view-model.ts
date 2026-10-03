import { FEATURE_BY_ID, FEATURE_TAXONOMY } from "./feature-taxonomy";
import { isUnknownEvidence, type CrawlQuality } from "./crawl-quality";
import {
  hasRenderableEvidence,
  resolveCompetitorEvidence,
  resolveOwnerEvidence,
  resolveProfileBullets,
  type ResolvedEvidence,
} from "./evidence-resolver";
import {
  buildThemeComparisons,
  summarizeThemes,
  type ThemeComparison,
  type ThemeSummary,
} from "./theme-builder";
import type {
  CompetitorIntelligence,
  MarketGap,
  NormalizedSiteFeatures,
} from "./types";

export type { ResolvedEvidence } from "./evidence-resolver";
export { hasRenderableEvidence } from "./evidence-resolver";
export type { ThemeComparison, ThemeSummary, ThemeStanding } from "./theme-builder";

/** @deprecated Prefer ThemeComparison — kept for any transitional imports */
export type SideBySideRow = ThemeComparison;

export interface MarketAction {
  featureId: string;
  title: string;
  priority: MarketGap["priority"];
  evidence: string;
  impact: string;
  recommendation: string;
  confidence: number;
  rankScore: number;
  whoLeadsName?: string;
  whoLeadsUrl?: string;
  linkedLeakIds?: string[];
  ownerScore?: number;
  marketScore?: number;
  missingCriteria?: string[];
}

export interface CompetitorProfileCard {
  id: string;
  name: string;
  url: string;
  relevanceScore: number;
  crawlQuality?: CrawlQuality;
  selectionReason?: string;
  strengths: Array<{ text: string; confidence: number }>;
  weaknesses: Array<{ text: string; confidence: number }>;
}

export interface AppendixRow {
  featureId: string;
  label: string;
  owner: ResolvedEvidence;
  marketScore: number | null;
  delta: number | null;
}

export interface VerdictItem {
  featureId: string;
  label: string;
  confidence: number;
}

export interface MarketComparisonViewModel {
  metadata: {
    category: string;
    geography: string;
    buyerGoal: string;
    competitorCount: number;
    needsRegenForSideBySide: boolean;
    canClaimMarketAverage: boolean;
  };
  coverage: { warnings: string[] };
  executiveSummary: string;
  verdict: {
    headline: string;
    support: string;
    behind: VerdictItem[];
    ahead: VerdictItem[];
  };
  competitors: CompetitorProfileCard[];
  sideBySide: {
    defaultCompetitorUrl: string | null;
    /** Summary for the default competitor (UI may recompute from active list). */
    summary: ThemeSummary;
    summaryByCompetitorUrl: Record<string, ThemeSummary>;
    byCompetitorUrl: Record<string, ThemeComparison[]>;
  };
  actions: MarketAction[];
  appendix: AppendixRow[];
}

const IMPACT_WEIGHT: Record<MarketGap["priority"], number> = {
  critical: 1,
  high: 0.85,
  medium: 0.6,
  low: 0.4,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function avgMarketScore(
  competitorFeatures: NormalizedSiteFeatures[],
  featureId: string,
): number | null {
  const scores = competitorFeatures
    .map((c) => c.features[featureId]?.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function whoLeadsOnFeature(
  featureId: string,
  intelligence: CompetitorIntelligence,
  competitorFeatures: NormalizedSiteFeatures[],
): { name: string; url: string } | null {
  const ownerScore =
    intelligence.owner_features.features[featureId]?.score ?? -1;
  let best: NormalizedSiteFeatures | null = null;
  let bestScore = -1;
  for (const c of competitorFeatures) {
    const s = c.features[featureId]?.score ?? -1;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (!best || bestScore <= ownerScore) return null;
  const summary = intelligence.competitorSummaries.find(
    (s) => s.canonicalUrl === best!.siteUrl,
  );
  return {
    name: summary?.name ?? best.siteName,
    url: best.siteUrl,
  };
}

function competitorAgreement(
  intelligence: CompetitorIntelligence,
  featureId: string,
  ownerScore: number | undefined,
): number {
  const urls = intelligence.competitorSummaries.map((s) => s.canonicalUrl);
  if (urls.length === 0) return 0.25;
  let agree = 0;
  let considered = 0;
  for (const url of urls) {
    const ev = resolveCompetitorEvidence(intelligence, url, featureId);
    if (!hasRenderableEvidence(ev)) continue;
    considered += 1;
    const cs = ev.score ?? 0;
    if (ownerScore == null || cs > ownerScore) agree += 1;
  }
  if (considered === 0) return 0.25;
  return Math.max(0.25, Math.min(1, agree / considered));
}

function buildVerdictFromResolved(
  behind: VerdictItem[],
  ahead: VerdictItem[],
  gaps: MarketGap[],
): { headline: string; support: string } {
  const topBehind = behind[0];
  const topAhead = ahead[0];
  const behindLabel = topBehind?.label ?? null;
  const aheadLabel = topAhead?.label ?? null;

  if (!behindLabel && !aheadLabel) {
    return {
      headline: "Not enough verified evidence for a clear market verdict yet",
      support:
        "Refresh market intelligence after a deeper crawl, or add competitor hints so we can compare like-for-like pages.",
    };
  }

  const behindGap = gaps.find((g) => g.featureId === topBehind?.featureId);
  const aheadGap = gaps.find((g) => g.featureId === topAhead?.featureId);
  const behindPts = behindGap
    ? Math.round(
        Math.abs(
          behindGap.scoreDelta ??
            (behindGap.marketScore ?? 0) - (behindGap.ownerScore ?? 0),
        ),
      )
    : 0;
  const aheadPts = aheadGap
    ? Math.round(
        Math.abs(
          aheadGap.scoreDelta ??
            (aheadGap.ownerScore ?? 0) - (aheadGap.marketScore ?? 0),
        ),
      )
    : 0;

  const behindPart =
    behindLabel && behindPts > 0
      ? `behind on ${behindLabel} by ${behindPts} pts`
      : behindLabel
        ? `behind on ${behindLabel}`
        : null;
  const aheadPart =
    aheadLabel && aheadPts > 0
      ? `ahead on ${aheadLabel} by ${aheadPts} pts`
      : aheadLabel
        ? `ahead on ${aheadLabel}`
        : null;

  let headline = "You're ";
  if (behindPart && aheadPart) headline += `${behindPart} — ${aheadPart}`;
  else if (behindPart) headline += behindPart;
  else headline += aheadPart!;

  const support =
    behindGap?.impact?.slice(0, 180) ??
    aheadGap?.impact?.slice(0, 180) ??
    "Focus on the top actions below — each one is tied to evidence from competitor sites.";

  return { headline: capitalize(headline), support };
}

export function buildMarketComparisonViewModel(
  intelligence: CompetitorIntelligence,
): MarketComparisonViewModel {
  const summaries = intelligence.competitorSummaries;
  const competitorFeatures = intelligence.competitor_features ?? [];
  const needsRegenForSideBySide =
    summaries.length > 0 && competitorFeatures.length === 0;

  const coverageWarnings: string[] = [];
  for (const s of summaries) {
    const q: CrawlQuality = s.crawlQuality ?? "partial";
    if (q === "weak") {
      coverageWarnings.push(
        `${s.name}: weak crawl — treat findings as directional`,
      );
    } else if (q === "partial") {
      coverageWarnings.push(
        `${s.name}: partial crawl — some pages may be missing`,
      );
    }
  }
  for (const lim of intelligence.limitations) {
    if (/truncat|limited|block|failed|unavailable/i.test(lim)) {
      if (!coverageWarnings.some((w) => w.includes(lim.split(":")[0] ?? ""))) {
        coverageWarnings.push(lim);
      }
    }
  }

  const usableCompetitors = summaries.filter(
    (s) => (s.crawlQuality ?? "partial") !== "weak",
  );
  const hasRealMarketSignal = intelligence.market_expectations.expectations.some(
    (e) => e.marketScore > 0,
  );
  const canClaimMarketAverage =
    usableCompetitors.length >= 2 &&
    intelligence.market_expectations.competitorCount >= 2 &&
    hasRealMarketSignal;

  // --- Competitors (profiles) ---
  const sortedSummaries = [...summaries].sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );
  const competitors: CompetitorProfileCard[] = sortedSummaries.map((s) => {
    const features =
      competitorFeatures.find((f) => f.siteUrl === s.canonicalUrl) ?? undefined;
    return {
      id: s.crawlPackId,
      name: s.name,
      url: s.canonicalUrl,
      relevanceScore: s.relevanceScore,
      crawlQuality: s.crawlQuality,
      selectionReason: s.selectionReason,
      strengths: resolveProfileBullets(s.topStrengths, "strength", features),
      weaknesses: resolveProfileBullets(s.weaknesses, "weakness", features),
    };
  });

  // --- Verdict from resolved evidence ---
  const behind: VerdictItem[] = [];
  const ahead: VerdictItem[] = [];

  for (const def of FEATURE_TAXONOMY) {
    const owner = resolveOwnerEvidence(intelligence, def.id);
    if (!hasRenderableEvidence(owner) && owner.score == null) continue;

    const marketAvg = avgMarketScore(competitorFeatures, def.id);
    const gap = intelligence.market_gaps.find((g) => g.featureId === def.id);

    let compsWithSignal = 0;
    let compsAhead = 0;
    for (const s of summaries) {
      const ce = resolveCompetitorEvidence(intelligence, s.canonicalUrl, def.id);
      if (!hasRenderableEvidence(ce) && ce.score == null) continue;
      compsWithSignal += 1;
      const os = owner.score ?? 0;
      const cs = ce.score ?? 0;
      if (cs > os + 5) compsAhead += 1;
    }

    const confidence = Math.max(
      owner.confidence,
      gap ? 0.55 : 0,
      compsWithSignal > 0 ? 0.4 : 0,
    );

    if (
      gap?.gapType === "differentiation_opportunity" ||
      (owner.score != null &&
        marketAvg != null &&
        owner.score > marketAvg + 10 &&
        hasRenderableEvidence(owner))
    ) {
      ahead.push({ featureId: def.id, label: def.label, confidence });
    } else if (
      gap != null ||
      (owner.score != null &&
        marketAvg != null &&
        owner.score + 10 < marketAvg) ||
      (compsWithSignal >= 2 && compsAhead / compsWithSignal >= 0.5)
    ) {
      if (hasRenderableEvidence(owner) || marketAvg != null || gap) {
        behind.push({ featureId: def.id, label: def.label, confidence });
      }
    }
  }

  behind.sort((a, b) => b.confidence - a.confidence);
  ahead.sort((a, b) => b.confidence - a.confidence);
  const behindTop = behind.slice(0, 3);
  const aheadTop = ahead.slice(0, 3);

  const { headline, support } = buildVerdictFromResolved(
    behindTop,
    aheadTop,
    intelligence.market_gaps,
  );

  // --- Actions ---
  const actionsRaw: MarketAction[] = [];
  for (const gap of intelligence.market_gaps) {
    if (gap.gapType === "differentiation_opportunity") continue;
    const ownerEv = resolveOwnerEvidence(intelligence, gap.featureId);
    const marketKnown = gap.marketScore != null && gap.marketScore > 0;
    const renderable =
      hasRenderableEvidence(ownerEv) ||
      marketKnown ||
      !isUnknownEvidence(gap.evidence);
    if (!renderable) continue;

    const confidence = Math.max(
      ownerEv.confidence,
      marketKnown ? 0.55 : 0,
      !isUnknownEvidence(gap.evidence) ? 0.5 : 0,
    );
    if (confidence <= 0) continue;

    const agreement = competitorAgreement(
      intelligence,
      gap.featureId,
      gap.ownerScore ?? ownerEv.score,
    );
    const rankScore = IMPACT_WEIGHT[gap.priority] * confidence * agreement;
    const leader = whoLeadsOnFeature(
      gap.featureId,
      intelligence,
      competitorFeatures,
    );

    actionsRaw.push({
      featureId: gap.featureId,
      title: gap.gap,
      priority: gap.priority,
      evidence: gap.evidence,
      impact: gap.impact,
      recommendation: gap.recommendation,
      confidence,
      rankScore,
      whoLeadsName: leader?.name,
      whoLeadsUrl: leader?.url,
      linkedLeakIds: gap.linkedLeakIds,
      ownerScore: gap.ownerScore,
      marketScore: gap.marketScore,
      missingCriteria: gap.missingCriteria,
    });
  }
  const actions = actionsRaw
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5);

  // --- Theme comparison (business side-by-side) ---
  const defaultCompetitorUrl = sortedSummaries[0]?.canonicalUrl ?? null;
  const byCompetitorUrl: Record<string, ThemeComparison[]> = {};
  const summaryByCompetitorUrl: Record<string, ThemeSummary> = {};
  for (const s of sortedSummaries) {
    const themes = buildThemeComparisons(intelligence, s.canonicalUrl);
    byCompetitorUrl[s.canonicalUrl] = themes;
    summaryByCompetitorUrl[s.canonicalUrl] = summarizeThemes(themes);
  }
  const emptySummary: ThemeSummary = {
    themeCount: 0,
    behind: 0,
    ahead: 0,
    similar: 0,
    unknown: 0,
  };
  const summary =
    (defaultCompetitorUrl
      ? summaryByCompetitorUrl[defaultCompetitorUrl]
      : undefined) ?? emptySummary;

  // --- Appendix ---
  const appendix: AppendixRow[] = canClaimMarketAverage
    ? intelligence.market_expectations.expectations
        .map((exp) => {
          const owner = resolveOwnerEvidence(intelligence, exp.featureId);
          const marketScore =
            exp.marketScore > 0 ? exp.marketScore : null;
          const ownerScore =
            hasRenderableEvidence(owner) && owner.score != null
              ? owner.score
              : owner.status === "score_only"
                ? owner.score
                : undefined;
          const delta =
            ownerScore != null && marketScore != null
              ? ownerScore - marketScore
              : null;
          return {
            featureId: exp.featureId,
            label: FEATURE_BY_ID.get(exp.featureId)?.label ?? exp.featureId,
            owner,
            marketScore,
            delta,
          };
        })
        .filter(
          (r) =>
            hasRenderableEvidence(r.owner) ||
            r.owner.status === "score_only" ||
            r.marketScore != null,
        )
        .sort(
          (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
        )
        .slice(0, 15)
    : [];

  const competitorNames = summaries.map((s) => s.name).slice(0, 4);
  const executiveSummary = [
    `Compared ${intelligence.owner_features.siteName} in ${intelligence.market_definition.category}`,
    intelligence.market_definition.geography
      ? `(${intelligence.market_definition.geography})`
      : "",
    competitorNames.length
      ? `against ${competitorNames.join(", ")}${summaries.length > competitorNames.length ? ` and ${summaries.length - competitorNames.length} more` : ""}.`
      : "— no suitable competitors were available for a fair set.",
    coverageWarnings.length
      ? ` Coverage note: ${coverageWarnings.slice(0, 2).join("; ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    metadata: {
      category: intelligence.market_definition.category,
      geography: intelligence.market_definition.geography,
      buyerGoal: intelligence.market_definition.buyerGoal,
      competitorCount: summaries.length,
      needsRegenForSideBySide,
      canClaimMarketAverage,
    },
    coverage: { warnings: coverageWarnings },
    executiveSummary,
    verdict: {
      headline,
      support,
      behind: behindTop,
      ahead: aheadTop,
    },
    competitors,
    sideBySide: {
      defaultCompetitorUrl,
      summary,
      summaryByCompetitorUrl,
      byCompetitorUrl,
    },
    actions,
    appendix,
  };
}
