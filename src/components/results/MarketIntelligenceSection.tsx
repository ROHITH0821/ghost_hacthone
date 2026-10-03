"use client";

import { useMemo, useState } from "react";
import { Download, Sparkles, Target, Compass } from "lucide-react";

import { buildMarketComparisonViewModel } from "@/lib/competitor-intelligence/comparison-view-model";
import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { copy } from "@/lib/copy";

import { ComparisonAppendix } from "./market-comparison/ComparisonAppendix";
import { CompetitorProfiles } from "./market-comparison/CompetitorProfiles";
import { ExecutiveSummary } from "./market-comparison/ExecutiveSummary";
import { MarketActionCard } from "./market-comparison/MarketActionCard";
import { SideBySideCompare } from "./market-comparison/SideBySideCompare";
import { VerdictHero } from "./market-comparison/VerdictHero";

interface MarketIntelligenceSectionProps {
  intelligence: CompetitorIntelligence;
  onFixLink?: (leakId: string) => void;
  compact?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
  reportMissionId?: string | null;
}

export function MarketIntelligenceSection({
  intelligence,
  onFixLink,
  compact = false,
  onRegenerate,
  regenerating,
  reportMissionId,
}: MarketIntelligenceSectionProps) {
  const view = useMemo(
    () => buildMarketComparisonViewModel(intelligence),
    [intelligence],
  );

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const activeUrl = selectedUrl ?? view.sideBySide.defaultCompetitorUrl;
  const rows = activeUrl
    ? (view.sideBySide.byCompetitorUrl[activeUrl] ?? [])
    : [];
  const summary = activeUrl
    ? (view.sideBySide.summaryByCompetitorUrl[activeUrl] ??
      view.sideBySide.summary)
    : view.sideBySide.summary;

  return (
    <section
      id="market-intelligence"
      className={compact ? "space-y-8 scroll-mt-24" : "mt-12 space-y-10 scroll-mt-24"}
    >
      {/* Header Banner */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet/20 text-violet border border-violet/40">
              <Compass className="h-3 w-3" />
            </span>
            <p className="label-caps font-mono tracking-widest text-violet-glow text-xs uppercase">
              MARKET INTELLIGENCE
            </p>
          </div>
          <h3 className="mt-2 font-heading text-2xl font-bold text-ghost-white md:text-3xl tracking-tight">
            How your site compares in its market
          </h3>
          <p className="mt-1 text-sm text-muted-light">
            {copy.marketIntelligence.subtitle(
              view.metadata.category,
              view.metadata.competitorCount,
            )}
          </p>
        </div>

        {reportMissionId && (
          <a
            href={`/api/reports/${reportMissionId}/pdf`}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface-elevated/90 px-4 py-2.5 text-xs font-semibold text-ghost-white hover:border-violet/50 hover:bg-violet/10 hover:text-violet-glow transition-all shadow-md active:scale-98"
          >
            <Download className="h-4 w-4 text-violet" />
            <span>{copy.marketIntelligence.downloadPdf}</span>
          </a>
        )}
      </header>

      {/* Executive Summary */}
      <ExecutiveSummary
        view={view}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
      />

      {/* Verdict Hero */}
      <VerdictHero view={view} />

      {/* Top Actions Section */}
      <div className="space-y-4 pt-2" id="market-top-actions">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet" />
            <h3 className="font-heading text-xl font-bold text-ghost-white">
              {copy.marketIntelligence.topActionsTitle}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            The highest-impact gaps Ghost found in your market.
          </p>
        </div>

        {view.actions.length > 0 ? (
          <div className="grid gap-4">
            {view.actions.map((action, i) => (
              <MarketActionCard
                key={`${action.featureId}-${action.priority}`}
                action={action}
                index={i}
                onFixLink={onFixLink}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border/60 bg-midnight/40 p-6 text-center text-sm text-muted">
            {copy.marketIntelligence.noActions}
          </p>
        )}
      </div>

      {/* Side by Side Comparison */}
      <SideBySideCompare
        competitors={view.competitors}
        selectedUrl={activeUrl}
        onSelect={setSelectedUrl}
        rows={rows}
        summary={summary}
        needsRegen={view.metadata.needsRegenForSideBySide}
      />

      {/* Competitor Profiles */}
      <CompetitorProfiles competitors={view.competitors} />

      {/* Detailed Feature Comparison Appendix */}
      <ComparisonAppendix
        rows={view.appendix}
        canClaimMarketAverage={view.metadata.canClaimMarketAverage}
      />
    </section>
  );
}

