"use client";

import type { MarketGap } from "@/lib/competitor-intelligence/types";
import { copy } from "@/lib/copy";

const PRIORITY_STYLES: Record<MarketGap["priority"], string> = {
  critical: "bg-ember-soft text-ember-text border-ember/25",
  high: "bg-[#FEF3E2] text-sev-medium-text border-sev-medium/35",
  medium: "bg-violet/20 text-violet border-violet/30",
  low: "bg-muted/20 text-muted-light border-border/60",
};

interface MarketGapCardProps {
  gap: MarketGap;
  onFixLink?: (leakId: string) => void;
}

export function MarketGapCard({ gap, onFixLink }: MarketGapCardProps) {
  return (
    <article className="rounded-2xl border border-border/60 bg-midnight/40 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="font-heading text-lg font-semibold text-ghost-white">{gap.gap}</h4>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[gap.priority]}`}
        >
          {gap.priority}
        </span>
      </div>

      {gap.ownerScore != null && gap.marketScore != null && (
        <p className="mt-2 text-sm text-muted-light">
          {copy.marketIntelligence.scoreComparison(gap.ownerScore, gap.marketScore)}
        </p>
      )}

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-muted-light">{copy.marketIntelligence.gapEvidence}</dt>
          <dd className="mt-1 text-ghost-white/90">{gap.evidence}</dd>
          {gap.missingCriteria && gap.missingCriteria.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-muted">
              <li className="list-none font-medium text-muted-light">
                {copy.marketIntelligence.missingCriteriaLabel}:
              </li>
              {gap.missingCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <dt className="font-medium text-muted-light">{copy.marketIntelligence.gapImpact}</dt>
          <dd className="mt-1 text-ghost-white/90">{gap.impact}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-light">
            {copy.marketIntelligence.gapRecommendation}
          </dt>
          <dd className="mt-1 text-ghost-white">{gap.recommendation}</dd>
        </div>
      </dl>

      {gap.linkedLeakIds && gap.linkedLeakIds.length > 0 && onFixLink && (
        <div className="mt-4 flex flex-wrap gap-2">
          {gap.linkedLeakIds.map((leakId) => (
            <button
              key={leakId}
              type="button"
              onClick={() => onFixLink(leakId)}
              className="rounded-lg border border-violet/30 bg-violet/10 px-3 py-1 text-xs text-violet"
            >
              {copy.marketIntelligence.viewRelatedFix}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
