"use client";

import type { CompetitorProfileCard } from "@/lib/competitor-intelligence/comparison-view-model";
import { copy } from "@/lib/copy";
import { ExternalLink, Check, X, Building2, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

function qualityLabel(q: CompetitorProfileCard["crawlQuality"]): string {
  if (q === "good") return copy.marketIntelligence.crawlQualityGood;
  if (q === "weak") return copy.marketIntelligence.crawlQualityWeak;
  return copy.marketIntelligence.crawlQualityPartial;
}

function qualityClass(q: CompetitorProfileCard["crawlQuality"]): string {
  if (q === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (q === "weak") return "border-red-500/30 bg-red-500/10 text-red-400";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export function CompetitorProfiles({
  competitors,
}: {
  competitors: CompetitorProfileCard[];
}) {
  if (competitors.length === 0) return null;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <Building2 className="h-4 w-4 text-violet" />
        <h3 className="font-heading text-xl font-bold text-ghost-white">
          {copy.marketIntelligence.competitorProfilesTitle}
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {competitors.map((c) => (
          <article
            key={c.id}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-midnight/50 p-5 backdrop-blur-md transition-all hover:border-violet/40 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/30 pb-3">
                <div>
                  <h4 className="font-heading text-lg font-bold text-ghost-white group-hover:text-violet-glow transition-colors">
                    {c.name}
                  </h4>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-muted-light hover:text-violet hover:underline"
                  >
                    <span>{c.url.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-violet-300">
                    {c.relevanceScore}% RELEVANCE
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium capitalize ${qualityClass(c.crawlQuality)}`}
                  >
                    {qualityLabel(c.crawlQuality)}
                  </span>
                </div>
              </div>

              {c.selectionReason && (
                <div className="mt-3 rounded-xl border border-border/40 bg-surface/40 p-3 text-xs text-ghost-white/90">
                  <p className="label-caps text-[9px] tracking-wider text-muted font-mono uppercase">
                    {copy.marketIntelligence.whySelected}
                  </p>
                  <p className="mt-1 text-muted-light/90 leading-relaxed">{c.selectionReason}</p>
                </div>
              )}

              <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-2 font-mono uppercase tracking-wider text-[10px]">
                    <Check className="h-3.5 w-3.5" />
                    <span>{copy.marketIntelligence.topStrengths}</span>
                  </div>
                  <ul className="space-y-1.5 text-ghost-white/90">
                    {(c.strengths.length
                      ? c.strengths
                      : [{ text: copy.marketIntelligence.noneListed, confidence: 0 }]
                    ).map((s) => (
                      <li key={s.text} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span className="leading-snug">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-red-400 mb-2 font-mono uppercase tracking-wider text-[10px]">
                    <X className="h-3.5 w-3.5" />
                    <span>{copy.marketIntelligence.weaknesses}</span>
                  </div>
                  <ul className="space-y-1.5 text-ghost-white/90">
                    {(c.weaknesses.length
                      ? c.weaknesses
                      : [{ text: copy.marketIntelligence.noneListed, confidence: 0 }]
                    ).map((w) => (
                      <li key={w.text} className="flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0">×</span>
                        <span className="leading-snug">{w.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

