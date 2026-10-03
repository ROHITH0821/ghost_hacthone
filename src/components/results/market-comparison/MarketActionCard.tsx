"use client";

import { useState } from "react";
import type { MarketAction } from "@/lib/competitor-intelligence/comparison-view-model";
import { copy } from "@/lib/copy";
import { ChevronDown, ExternalLink, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

const PRIORITY_STYLES: Record<MarketAction["priority"], { badge: string; border: string }> = {
  critical: {
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    border: "border-red-500/30 hover:border-red-500/50",
  },
  high: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-amber-500/30 hover:border-amber-500/50",
  },
  medium: {
    badge: "bg-violet/15 text-violet-300 border-violet/30",
    border: "border-violet/30 hover:border-violet/50",
  },
  low: {
    badge: "bg-muted/15 text-muted-light border-border/60",
    border: "border-border/60 hover:border-border",
  },
};

interface MarketActionCardProps {
  action: MarketAction;
  index: number;
  onFixLink?: (leakId: string) => void;
}

export function MarketActionCard({ action, index, onFixLink }: MarketActionCardProps) {
  const [expanded, setExpanded] = useState(index === 0); // Expand first by default for fast scan
  const style = PRIORITY_STYLES[action.priority];
  const formattedIndex = String(index + 1).padStart(2, "0");
  const confidencePct = Math.round(action.confidence * 100);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-midnight/50 p-5 transition-all backdrop-blur-md shadow-md ${style.border}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet/40 bg-violet/10 font-mono text-xs font-bold text-violet-glow shadow-inner">
            {formattedIndex}
          </span>
          <div>
            <h4 className="font-heading text-base font-semibold leading-snug text-ghost-white md:text-lg">
              {action.title}
            </h4>
            {action.whoLeadsName && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-light">
                <span>{copy.marketIntelligence.whoDoesBetter}:</span>
                {action.whoLeadsUrl ? (
                  <a
                    href={action.whoLeadsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-violet hover:text-violet-glow hover:underline"
                  >
                    <span>{action.whoLeadsName}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-semibold text-ghost-white">{action.whoLeadsName}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
          >
            {action.priority}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-midnight/80 px-2.5 py-0.5 text-[10px] font-medium text-muted-light">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Verified · {confidencePct}%</span>
          </span>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 bg-midnight/60 text-muted transition-colors hover:text-ghost-white hover:border-violet/40"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Details Section */}
      {expanded && (
        <div className="mt-5 space-y-4 border-t border-border/40 pt-4 text-xs md:text-sm">
          <div className="grid gap-3 rounded-xl border border-border/40 bg-surface/30 p-4">
            <div>
              <dt className="label-caps text-[10px] tracking-wider text-muted font-mono uppercase">
                {copy.marketIntelligence.gapEvidence}
              </dt>
              <dd className="mt-1 leading-relaxed text-ghost-white/90">{action.evidence}</dd>
              {action.missingCriteria && action.missingCriteria.length > 0 && (
                <ul className="mt-2 grid gap-1 pl-4 list-disc text-xs text-muted-light/80">
                  {action.missingCriteria.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <dt className="label-caps text-[10px] tracking-wider text-muted font-mono uppercase">
                {copy.marketIntelligence.gapImpact}
              </dt>
              <dd className="mt-1 leading-relaxed text-amber-200/90 font-medium">{action.impact}</dd>
            </div>

            <div>
              <dt className="label-caps text-[10px] tracking-wider text-violet-glow font-mono uppercase">
                {copy.marketIntelligence.gapRecommendation}
              </dt>
              <dd className="mt-1 font-semibold leading-relaxed text-ghost-white">
                {action.recommendation}
              </dd>
            </div>
          </div>

          {onFixLink && action.linkedLeakIds?.slice(0, 1).map((leakId) => (
            <button
              key={leakId}
              type="button"
              onClick={() => onFixLink(leakId)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet hover:text-violet-glow hover:underline"
            >
              <span>{copy.marketIntelligence.viewRelatedFix}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

