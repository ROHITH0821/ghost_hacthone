import { ghostSystem, evidenceText } from "@/lib/ghost-engine/prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

import { anthropic } from "@/lib/ghost-engine/client";
import { MODEL, STRUCTURED_THINKING } from "@/lib/ghost-engine/config";
import { journeyPathScore } from "@/lib/ghost-engine/ingest/prioritize";
import { parseStructuredWithTimeout } from "@/lib/ghost-engine/util";

import { COMPETITOR_EXTRACT_MAX_PAGES } from "./config";
import { FEATURE_BY_ID, FEATURE_TAXONOMY } from "./feature-taxonomy";
import { buildFeatureSummary, clampScore, scoreToStatus } from "./score-utils";
import { isKnownFeature, isUnknownEvidence } from "./crawl-quality";
import type {
  CompetitorCrawlPack,
  CriterionScore,
  FeatureScore,
  NormalizedSiteFeatures,
} from "./types";
import { computeFeatureScoreFromDefinitions } from "./feature-taxonomy";

const CriterionExtractionSchema = z.object({
  criterionId: z.string(),
  score: z.number().min(0).max(100),
  evidence: z.string(),
  sourceUrls: z.array(z.string()).max(5).optional(),
});

const FeatureExtractionSchema = z.object({
  siteName: z.string(),
  features: z.record(
    z.string(),
    z.object({
      criteria: z.array(CriterionExtractionSchema),
    }),
  ),
  topStrengths: z.array(z.string()).max(3).optional(),
  weaknesses: z.array(z.string()).max(3).optional(),
  evidenceHighlights: z.array(z.string()).max(3).optional(),
});

function buildFeaturePromptList(): string {
  return FEATURE_TAXONOMY.map((f) => {
    const criteriaLines = f.criteria
      .map((c) => `    - ${c.id}: ${c.label}`)
      .join("\n");
    return `- ${f.id}: ${f.label} — ${f.description}\n  Criteria:\n${criteriaLines}`;
  }).join("\n\n");
}

function buildFeatureScore(
  featureId: string,
  rawCriteria: Array<{
    criterionId: string;
    score: number;
    evidence: string;
    sourceUrls?: string[];
  }>,
): FeatureScore {
  const def = FEATURE_BY_ID.get(featureId)!;
  const criteria: CriterionScore[] = def.criteria.map((cDef) => {
    const extracted = rawCriteria.find((c) => c.criterionId === cDef.id);
    const score = clampScore(extracted?.score ?? 0);
    return {
      criterionId: cDef.id,
      label: cDef.label,
      score,
      status: scoreToStatus(score),
      evidence: extracted?.evidence ?? "Not observed on crawled pages",
    };
  });

  const score = computeFeatureScoreFromDefinitions(
    featureId,
    criteria.map((c) => ({ criterionId: c.criterionId, score: c.score })),
  );

  const sourceUrls = [
    ...new Set(rawCriteria.flatMap((c) => c.sourceUrls ?? [])),
  ].slice(0, 5);

  return {
    score,
    summary: buildFeatureSummary(criteria.map((c) => ({ label: c.label, score: c.score }))),
    sourceUrls,
    criteria,
  };
}

/** Cap pages for the extract prompt: prefer journey score, then text richness. */
export function selectPagesForExtract<
  T extends { url: string; textExcerpt: string; title?: string },
>(pages: T[], maxPages: number = COMPETITOR_EXTRACT_MAX_PAGES): T[] {
  if (pages.length <= maxPages) return pages;
  const ranked = [...pages].sort((a, b) => {
    const scoreA =
      journeyPathScore(a.url) * 1000 +
      Math.min(2000, a.textExcerpt.replace(/\s+/g, " ").trim().length);
    const scoreB =
      journeyPathScore(b.url) * 1000 +
      Math.min(2000, b.textExcerpt.replace(/\s+/g, " ").trim().length);
    return scoreB - scoreA;
  });
  // Always keep homepage if present
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

export async function extractSiteFeatures(input: {
  siteUrl: string;
  siteName: string;
  pages: Array<{ url: string; title: string; metaDescription: string; textExcerpt: string }>;
}): Promise<NormalizedSiteFeatures> {
  const pagesForPrompt = selectPagesForExtract(input.pages);

  const response = await parseStructuredWithTimeout("extractSiteFeatures", (signal) =>
    anthropic().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: STRUCTURED_THINKING,
      system: ghostSystem("Market research: extract-features", `You score marketing/conversion criteria from crawled website pages AND list grounded strengths/weaknesses.

For each criterion id, return score 0-100:
- 0: absent or not mentioned in the provided text
- 35-65: partial, unclear, or buried
- 70-100: clear, prominent, buyer-ready

Scoring rules for B2B / SaaS marketing pages:
- Infer clarity, value props, CTAs, trust cues, social proof, and offers from homepage/product/about copy when present.
- Reserve evidence starting with "Not observed" ONLY when the signal is truly absent from the provided text.
- Prefer short concrete quotes or section references over boilerplate "Not found".
- Score EVERY criterion listed. Use sourceUrls from the provided pages only. Do NOT invent pages.

Also return:
- topStrengths: up to 3 short bullets of conversion/marketing strengths grounded in observed text (never empty if pages have substantive marketing copy — use the best observed signals).
- weaknesses: up to 3 short bullets of observed gaps or weak buyer signals grounded in the text (not inventing missing pages).
- evidenceHighlights: up to 3 short quote-backed highlights.

Do NOT invent competitors or pages that were not crawled.`),
      messages: [
        {
          role: "user",
          content: evidenceText(`Site: ${input.siteName} (${input.siteUrl})

Feature taxonomy with criteria:
${buildFeaturePromptList()}

Crawled pages:
${pagesForPrompt
  .map(
    (p) =>
      `URL: ${p.url}\nTitle: ${p.title}\nMeta: ${p.metaDescription}\nText:\n${p.textExcerpt.slice(0, 2000)}`,
  )
  .join("\n\n---\n\n")}

Return criteria scores for ALL feature ids, plus topStrengths, weaknesses, and evidenceHighlights.`),
        },
      ],
      output_config: { format: zodOutputFormat(FeatureExtractionSchema) },
    }, { signal, maxRetries: 0 }),
  );

  const parsed = response.parsed_output;
  const now = new Date().toISOString();
  const features: Record<string, FeatureScore> = {};

  for (const def of FEATURE_TAXONOMY) {
    const allowedUrls = new Set(pagesForPrompt.map(p => p.url));
    const extracted = (parsed?.features[def.id]?.criteria ?? []).map(c => ({ ...c, sourceUrls: c.sourceUrls?.filter(url => allowedUrls.has(url)) }));
    features[def.id] = buildFeatureScore(def.id, extracted);
  }

  const topStrengths = (parsed?.topStrengths ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const weaknesses = (parsed?.weaknesses ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const evidenceHighlights = (parsed?.evidenceHighlights ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    siteUrl: input.siteUrl,
    siteName: parsed?.siteName ?? input.siteName,
    extractedAt: now,
    features,
    highlights:
      topStrengths.length || weaknesses.length || evidenceHighlights.length
        ? { topStrengths, weaknesses, evidenceHighlights }
        : undefined,
  };
}

export async function extractFeaturesFromCrawlPack(
  pack: CompetitorCrawlPack,
): Promise<NormalizedSiteFeatures> {
  return extractSiteFeatures({
    siteUrl: pack.canonicalUrl,
    siteName: pack.name,
    pages: pack.pages,
  });
}

export function qualityScoreFromFeatures(features: NormalizedSiteFeatures): number {
  const known = FEATURE_TAXONOMY.map((def) => features.features[def.id]).filter(isKnownFeature);
  if (known.length === 0) return 0;
  return clampScore(known.reduce((a, f) => a + f.score, 0) / known.length);
}

export { isKnownFeature } from "./crawl-quality";

export function topStrengthsFromFeatures(features: NormalizedSiteFeatures): string[] {
  if (features.highlights?.topStrengths?.length) {
    return features.highlights.topStrengths.slice(0, 3);
  }

  const known = FEATURE_TAXONOMY.map((def) => ({
    def,
    f: features.features[def.id],
  })).filter(({ f }) => isKnownFeature(f));

  const strong = known
    .filter(({ f }) => (f?.score ?? 0) >= 50)
    .sort((a, b) => (b.f?.score ?? 0) - (a.f?.score ?? 0));

  const pool = strong.length > 0 ? strong : [...known].sort(
    (a, b) => (b.f?.score ?? 0) - (a.f?.score ?? 0),
  );

  return pool.slice(0, 3).map(({ def, f }) => {
    const topCriterion = [...(f!.criteria ?? [])]
      .filter((c) => !isUnknownEvidence(c.evidence))
      .sort((a, b) => b.score - a.score)[0];
    return `${def.label} (${f!.score}): ${topCriterion?.label ?? f!.summary}`;
  });
}

export function weaknessesFromFeatures(features: NormalizedSiteFeatures): string[] {
  if (features.highlights?.weaknesses?.length) {
    return features.highlights.weaknesses.slice(0, 3);
  }

  return FEATURE_TAXONOMY.map((def) => ({
    def,
    f: features.features[def.id],
  }))
    .filter(({ f }) => isKnownFeature(f) && (f?.score ?? 100) < 50)
    .sort((a, b) => (a.f?.score ?? 0) - (b.f?.score ?? 0))
    .slice(0, 3)
    .map(({ def, f }) => `${def.label} (${f?.score ?? 0}): ${f?.summary ?? "Weak vs market"}`);
}

export function evidenceHighlightsFromFeatures(features: NormalizedSiteFeatures): string[] {
  if (features.highlights?.evidenceHighlights?.length) {
    return features.highlights.evidenceHighlights.slice(0, 3);
  }

  const highlights: string[] = [];
  for (const def of FEATURE_TAXONOMY) {
    const f = features.features[def.id];
    if (!isKnownFeature(f) || !f || f.score < 50) continue;
    const top = [...f.criteria]
      .filter((c) => !isUnknownEvidence(c.evidence))
      .sort((a, b) => b.score - a.score)[0];
    if (top && f.sourceUrls[0]) {
      highlights.push(`${def.label} ${f.score} — ${top.label}: ${top.evidence.slice(0, 80)} (${f.sourceUrls[0]})`);
    } else if (top) {
      highlights.push(`${def.label} ${f.score} — ${top.label}: ${top.evidence.slice(0, 100)}`);
    }
    if (highlights.length >= 3) break;
  }
  return highlights;
}

export function topFeatureScoresFromFeatures(
  features: NormalizedSiteFeatures,
): NonNullable<import("./types").CompetitorSummary["topFeatureScores"]> {
  return FEATURE_TAXONOMY.map((def) => ({
    def,
    f: features.features[def.id],
  }))
    .filter(({ f }) => isKnownFeature(f) && f && f.score >= 40)
    .sort((a, b) => (b.f?.score ?? 0) - (a.f?.score ?? 0))
    .slice(0, 3)
    .map(({ def, f }) => {
      const topCriterion = [...(f!.criteria ?? [])]
        .filter((c) => !isUnknownEvidence(c.evidence))
        .sort((a, b) => b.score - a.score)[0];
      return {
        featureId: def.id,
        label: def.label,
        score: f!.score,
        topCriterion: topCriterion?.label,
      };
    });
}

export function featureLabel(featureId: string): string {
  return FEATURE_BY_ID.get(featureId)?.label ?? featureId;
}
