"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { CriterionScore, FeatureScore } from "@/lib/competitor-intelligence/types";
import { copy } from "@/lib/copy";

const STATUS_STYLES: Record<CriterionScore["status"], string> = {
  present: "bg-neon-green/15 text-neon-green border-neon-green/30",
  partial: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  absent: "bg-muted/15 text-muted-light border-border/60",
};

interface FeatureScoreBreakdownProps {
  label: string;
  feature: FeatureScore;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export function FeatureScoreBreakdown({
  label,
  feature,
  defaultExpanded = false,
  compact = false,
}: FeatureScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <article className="rounded-xl border border-border/60 bg-midnight/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ghost-white">{label}</p>
          {!compact && feature.summary && (
            <p className="mt-1 text-xs text-muted">{feature.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading text-2xl font-semibold text-ghost-white">
            {feature.score}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-violet"
            aria-expanded={expanded}
          >
            {copy.marketIntelligence.breakdown}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-violet"
          style={{ width: `${feature.score}%` }}
        />
      </div>

      {expanded && (
        <ul className="mt-4 space-y-2 border-t border-border/40 pt-3">
          {feature.criteria.map((c) => (
            <li key={c.criterionId} className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="text-ghost-white/90">{c.label}</span>
                {c.evidence && (
                  <p className="mt-0.5 text-xs text-muted">{c.evidence.slice(0, 120)}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[c.status]}`}
                >
                  {copy.marketIntelligence.criterionStatus[c.status]}
                </span>
                <span className="w-8 text-right text-xs font-medium text-muted-light">{c.score}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
