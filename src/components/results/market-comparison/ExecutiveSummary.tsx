"use client";

import type { MarketComparisonViewModel } from "@/lib/competitor-intelligence/comparison-view-model";
import { copy } from "@/lib/copy";
import { AlertTriangle, RefreshCw, FileText, Sparkles } from "lucide-react";

interface ExecutiveSummaryProps {
  view: MarketComparisonViewModel;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function ExecutiveSummary({
  view,
  onRegenerate,
  regenerating,
}: ExecutiveSummaryProps) {
  const warnings = view.coverage.warnings;
  const needsRegen = view.metadata.needsRegenForSideBySide;

  return (
    <div className="rounded-2xl border border-border/70 bg-midnight/60 p-6 backdrop-blur-md shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet" />
          <h3 className="label-caps text-xs tracking-widest text-ghost-white font-mono uppercase">
            {copy.marketIntelligence.executiveSummaryTitle}
          </h3>
        </div>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 rounded-xl border border-violet/40 bg-violet/10 px-3.5 py-1.5 text-xs font-semibold text-violet hover:bg-violet/20 hover:border-violet/60 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            <span>
              {regenerating
                ? copy.marketIntelligence.regenerating
                : copy.marketIntelligence.regenerate}
            </span>
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-light/90 md:text-base font-sans">
        {view.executiveSummary}
      </p>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200/90 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{copy.marketIntelligence.coverageTitle} Limitations</span>
          </div>
          <ul className="grid gap-1.5 pl-6 list-disc text-amber-200/80">
            {warnings.slice(0, 6).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {needsRegen && !onRegenerate && (
        <p className="text-xs text-muted flex items-center gap-1.5 pt-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          {copy.marketIntelligence.needsRegenSideBySide}
        </p>
      )}
    </div>
  );
}

