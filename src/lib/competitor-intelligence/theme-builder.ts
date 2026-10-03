import { FEATURE_BY_ID } from "./feature-taxonomy";
import {
  hasRenderableEvidence,
  resolveCompetitorEvidence,
  resolveOwnerEvidence,
  type ResolvedEvidence,
  type ResolvedEvidenceStatus,
} from "./evidence-resolver";
import { themeScoreById, type ThemeScore } from "./theme-score-lookup";
import {
  THEME_GROUPS,
  type ThemeGroupConfig,
  type ThemeId,
  type ThemeImpact,
} from "./theme-groups";
import type { CompetitorIntelligence, MarketGap } from "./types";

export type ThemeStanding = "ahead" | "behind" | "similar" | "unknown";

export interface ThemeSide {
  score: number | null;
  status: ResolvedEvidenceStatus;
  evidence: ResolvedEvidence;
  confidence: number;
}

export interface ThemeComparison {
  themeId: ThemeId;
  title: string;
  standing: ThemeStanding;
  impact: ThemeImpact;
  owner: ThemeSide;
  competitor: ThemeSide;
  whyItMatters: string;
  recommendedAction: string;
  memberFeatureIds: string[];
  /** Aggregate theme confidence 0–1 */
  confidence: number;
}

export interface ThemeSummary {
  themeCount: number;
  behind: number;
  ahead: number;
  similar: number;
  unknown: number;
}

const IMPACT_RANK: Record<ThemeImpact, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_RANK: Record<ResolvedEvidenceStatus, number> = {
  verified: 0,
  summarized: 1,
  inferred: 2,
  score_only: 3,
  not_observed: 4,
  not_crawled: 5,
};

const GAP_TO_IMPACT: Record<MarketGap["priority"], ThemeImpact> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

const STANDING_DELTA = 8;

function sideFromThemeScore(score: ThemeScore | undefined): ThemeSide {
  if (!score || score.status === "not_observed" || score.score == null) {
    return {
      score: null,
      status: "not_observed",
      confidence: 0,
      evidence: {
        status: "not_observed",
        confidence: 0,
        source: "score",
        explanation: "No observed evidence on crawled pages",
      },
    };
  }

  return {
    score: Math.round(score.score),
    status: "verified",
    confidence: 0.9,
    evidence: {
      status: "verified",
      confidence: 0.9,
      source: "criterion",
      score: Math.round(score.score),
      quote: score.quote ?? undefined,
      sourceUrl: score.sourceUrl,
    },
  };
}

function scoredMembers(
  members: Array<{ featureId: string; weight: number; evidence: ResolvedEvidence }>,
): Array<{ featureId: string; weight: number; evidence: ResolvedEvidence; score: number }> {
  const out: Array<{
    featureId: string;
    weight: number;
    evidence: ResolvedEvidence;
    score: number;
  }> = [];
  for (const m of members) {
    if (m.evidence.score == null) continue;
    if (m.evidence.status === "score_only" && m.evidence.score === 0) continue;
    if (
      (m.evidence.status === "not_observed" || m.evidence.status === "not_crawled") &&
      m.evidence.score == null
    ) {
      continue;
    }
    out.push({ ...m, score: m.evidence.score });
  }
  return out;
}

function weightedScore(
  members: Array<{ weight: number; evidence: ResolvedEvidence }>,
): number | null {
  const scored = scoredMembers(
    members.map((m) => ({
      featureId: "",
      weight: m.weight,
      evidence: m.evidence,
    })),
  );
  if (scored.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const s of scored) {
    num += s.weight * s.score;
    den += s.weight;
  }
  return den > 0 ? num / den : null;
}

function weightedConfidence(
  members: Array<{ weight: number; evidence: ResolvedEvidence }>,
): number {
  let num = 0;
  let den = 0;
  for (const m of members) {
    if (m.evidence.status === "score_only" && (m.evidence.score == null || m.evidence.score === 0)) {
      continue;
    }
    if (!hasRenderableEvidence(m.evidence) && m.evidence.status === "score_only") {
      num += m.weight * m.evidence.confidence;
      den += m.weight;
      continue;
    }
    if (!hasRenderableEvidence(m.evidence) && m.evidence.score == null) continue;
    if (m.evidence.score == null && !hasRenderableEvidence(m.evidence)) continue;
    num += m.weight * m.evidence.confidence;
    den += m.weight;
  }
  if (den === 0) {
    const any = members.filter(
      (m) => m.evidence.confidence > 0 && m.evidence.status !== "score_only",
    );
    if (any.length === 0) return 0;
    return any.reduce((a, m) => a + m.evidence.confidence, 0) / any.length;
  }
  return num / den;
}

function pickBestEvidence(evidences: ResolvedEvidence[]): ResolvedEvidence {
  if (evidences.length === 0) {
    return {
      status: "not_observed",
      confidence: 0,
      source: "score",
      explanation: "No member features",
    };
  }
  const usable = evidences.filter(
    (e) => !(e.status === "score_only" && (e.score == null || e.score === 0)),
  );
  const pool = usable.length > 0 ? usable : evidences;
  return [...pool].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return STATUS_RANK[a.status] - STATUS_RANK[b.status];
  })[0]!;
}

function standingFor(
  ownerScore: number | null,
  competitorScore: number | null,
): ThemeStanding {
  if (ownerScore == null && competitorScore == null) return "unknown";
  if (ownerScore == null || competitorScore == null) {
    if (ownerScore != null && competitorScore == null) return "ahead";
    if (competitorScore != null && ownerScore == null) return "behind";
    return "unknown";
  }
  if (ownerScore >= competitorScore + STANDING_DELTA) return "ahead";
  if (competitorScore >= ownerScore + STANDING_DELTA) return "behind";
  return "similar";
}

function impactForTheme(
  config: ThemeGroupConfig,
  gaps: MarketGap[],
): ThemeImpact {
  const ids = new Set(config.features.map((f) => f.featureId));
  const relevant = gaps.filter((g) => ids.has(g.featureId));
  if (relevant.length === 0) return config.defaultImpact;
  let best: ThemeImpact = config.defaultImpact;
  for (const g of relevant) {
    const mapped = GAP_TO_IMPACT[g.priority];
    if (IMPACT_RANK[mapped] < IMPACT_RANK[best]) best = mapped;
  }
  return best;
}

function actionForTheme(
  config: ThemeGroupConfig,
  gaps: MarketGap[],
): string {
  const ids = new Set(config.features.map((f) => f.featureId));
  const relevant = gaps
    .filter((g) => ids.has(g.featureId) && g.gapType !== "differentiation_opportunity")
    .sort(
      (a, b) =>
        IMPACT_RANK[GAP_TO_IMPACT[a.priority]] - IMPACT_RANK[GAP_TO_IMPACT[b.priority]],
    );
  return relevant[0]?.recommendation ?? config.defaultAction;
}

function whyItMattersFor(
  config: ThemeGroupConfig,
  ownerMembers: Array<{ featureId: string; evidence: ResolvedEvidence }>,
): string {
  let weakest: { featureId: string; score: number } | null = null;
  for (const m of ownerMembers) {
    if (m.evidence.score == null) continue;
    if (!weakest || m.evidence.score < weakest.score) {
      weakest = { featureId: m.featureId, score: m.evidence.score };
    }
  }
  if (weakest) {
    const def = FEATURE_BY_ID.get(weakest.featureId);
    if (def?.description) {
      return `${config.whyItMatters} (${def.label}: ${def.description})`;
    }
  }
  return config.whyItMatters;
}

function buildSide(
  members: Array<{ featureId: string; weight: number; evidence: ResolvedEvidence }>,
): ThemeSide {
  const score = weightedScore(members);
  const confidence = weightedConfidence(members);
  const best = pickBestEvidence(members.map((m) => m.evidence));
  if (
    score == null ||
    (best.status === "score_only" && (best.score == null || best.score === 0))
  ) {
    return {
      score: null,
      status: "not_observed",
      confidence: 0,
      evidence: {
        status: "not_observed",
        confidence: 0,
        source: "score",
        explanation: "No observed evidence on crawled pages",
      },
    };
  }
  return {
    score: Math.round(score),
    status: best.status === "score_only" ? "summarized" : best.status,
    evidence: best,
    confidence,
  };
}

function sortThemes(themes: ThemeComparison[]): ThemeComparison[] {
  const standingBucket = (s: ThemeStanding): number => {
    if (s === "behind") return 0;
    if (s === "similar") return 1;
    if (s === "ahead") return 2;
    return 3;
  };

  return [...themes].sort((a, b) => {
    const sb = standingBucket(a.standing) - standingBucket(b.standing);
    if (sb !== 0) return sb;
    if (a.standing === "behind" || a.standing === "similar") {
      const ia = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
      if (ia !== 0) return ia;
    }
    if (a.standing === "ahead") {
      const ia = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
      if (ia !== 0) return ia;
    }
    return b.confidence - a.confidence;
  });
}

export function summarizeThemes(themes: ThemeComparison[]): ThemeSummary {
  const summary: ThemeSummary = {
    themeCount: themes.length,
    behind: 0,
    ahead: 0,
    similar: 0,
    unknown: 0,
  };
  for (const t of themes) {
    summary[t.standing] += 1;
  }
  return summary;
}

function hasLlmThemeScores(intelligence: CompetitorIntelligence): boolean {
  return Boolean(
    intelligence.owner_theme_scores?.themes?.length &&
      intelligence.competitor_theme_scores?.length,
  );
}

/** Build all business themes for owner vs one competitor URL. */
export function buildThemeComparisons(
  intelligence: CompetitorIntelligence,
  competitorUrl: string,
): ThemeComparison[] {
  const gaps = intelligence.market_gaps;

  if (hasLlmThemeScores(intelligence)) {
    const rivalThemes = intelligence.competitor_theme_scores?.find(
      (s) => s.siteUrl === competitorUrl,
    );
    const themes: ThemeComparison[] = THEME_GROUPS.map((config) => {
      const owner = sideFromThemeScore(
        themeScoreById(intelligence.owner_theme_scores, config.id),
      );
      const competitor = sideFromThemeScore(themeScoreById(rivalThemes, config.id));
      const standing = standingFor(owner.score, competitor.score);
      const themeConfidence =
        Math.min(owner.confidence, competitor.confidence) ||
        Math.max(owner.confidence, competitor.confidence);

      return {
        themeId: config.id,
        title: config.title,
        standing,
        impact: impactForTheme(config, gaps),
        owner,
        competitor,
        whyItMatters: config.whyItMatters,
        recommendedAction: actionForTheme(config, gaps),
        memberFeatureIds: config.features.map((f) => f.featureId),
        confidence: themeConfidence,
      };
    });
    return sortThemes(themes);
  }

  const themes: ThemeComparison[] = [];

  for (const config of THEME_GROUPS) {
    const ownerMembers = config.features.map((f) => ({
      featureId: f.featureId,
      weight: f.weight ?? 1,
      evidence: resolveOwnerEvidence(intelligence, f.featureId),
    }));
    const competitorMembers = config.features.map((f) => ({
      featureId: f.featureId,
      weight: f.weight ?? 1,
      evidence: resolveCompetitorEvidence(intelligence, competitorUrl, f.featureId),
    }));

    const owner = buildSide(ownerMembers);
    const competitor = buildSide(competitorMembers);
    const standing = standingFor(owner.score, competitor.score);
    const themeConfidence =
      Math.min(owner.confidence, competitor.confidence) ||
      Math.max(owner.confidence, competitor.confidence);

    themes.push({
      themeId: config.id,
      title: config.title,
      standing,
      impact: impactForTheme(config, gaps),
      owner,
      competitor,
      whyItMatters: whyItMattersFor(config, ownerMembers),
      recommendedAction: actionForTheme(config, gaps),
      memberFeatureIds: config.features.map((f) => f.featureId),
      confidence: themeConfidence,
    });
  }

  return sortThemes(themes);
}
