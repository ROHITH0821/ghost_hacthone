"use client";

import type { RescanComparison } from "@/lib/db/comparisons";
import { copy } from "@/lib/copy";
import { AUDIT_TYPE_LABELS, type AuditType } from "@/lib/plans";
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Activity } from "lucide-react";

function LeakList({
  title,
  items,
  tone,
  badgeIcon,
}: {
  title: string;
  items: RescanComparison["resolved"];
  tone: "green" | "amber" | "danger";
  badgeIcon: React.ReactNode;
}) {
  const toneCls =
    tone === "green"
      ? "border-resolved/30 bg-[#E4F4EC] text-resolved-text"
      : tone === "danger"
        ? "border-ember/25 bg-ember-soft text-ember-text"
        : "border-sev-medium/35 bg-[#FEF3E2] text-sev-medium-text";

  return (
    <section className={`rounded-2xl border p-5 backdrop-blur-md transition-all shadow-md ${toneCls}`}>
      <div className="flex items-center gap-2 border-b border-current/15 pb-3">
        {badgeIcon}
        <h4 className="text-xs font-bold uppercase tracking-wider font-mono">{title} ({items.length})</h4>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-center text-xs italic opacity-60">None</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((leak) => (
            <li
              key={leak.matchKey}
              className="rounded-xl border border-current/20 bg-midnight/60 p-3 text-xs md:text-sm backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-semibold text-ghost-white">{leak.title}</span>
                {leak.category && (
                  <span className="rounded-md border border-border/50 bg-midnight px-2 py-0.5 font-mono text-[10px] text-muted-light">
                    {leak.category}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RescanComparisonView({
  comparison,
  verifiedFixes,
  baselineLabel,
  rescanLabel,
}: {
  comparison: RescanComparison;
  verifiedFixes: Array<{ id: string; title: string }>;
  baselineLabel: string;
  rescanLabel: string;
}) {
  const delta = Math.round(comparison.scoreDelta);
  const deltaPositive = delta > 0;
  const deltaZero = delta === 0;

  const baselineScoreRound = Math.round(comparison.baselineScore);
  const rescanScoreRound = Math.round(comparison.rescanScore);

  return (
    <div className="space-y-8">
      {/* Low Confidence Warning */}
      {(comparison.baselineLowConfidence || comparison.rescanLowConfidence) && (
        <div className="rounded-xl border border-sev-medium/35 bg-[#FEF3E2] p-4 text-xs text-sev-medium-text flex items-center gap-3 shadow-md">
          <AlertTriangle className="h-5 w-5 shrink-0 text-sev-medium-text" />
          <div>
            <p className="font-bold text-sev-medium-text uppercase tracking-wider font-mono text-[10px]">
              LIMITED CRAWL CONFIDENCE
            </p>
            <p className="mt-0.5 leading-relaxed">{copy.dashboardComparisons.lowConfidence}</p>
          </div>
        </div>
      )}

      {/* BEFORE / AFTER SCORE HERO CENTERPIECE */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-surface-elevated/90 to-surface/90 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
        
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-violet" />
          <span className="label-caps font-mono tracking-widest text-violet-glow text-xs uppercase">
            GHOST SCORE TRANSFORMATION
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-7 items-center">
          {/* Baseline Score */}
          <div className="md:col-span-3 rounded-2xl border border-border/60 bg-midnight/60 p-6 text-center shadow-inner backdrop-blur-sm">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
              {copy.dashboardComparisons.originalScore}
            </p>
            <p className="mt-2 font-heading text-4xl md:text-5xl font-extrabold text-ghost-white tracking-tight">
              {baselineScoreRound}
            </p>
            <p className="mt-2 text-xs font-mono text-muted-light">{baselineLabel}</p>
          </div>

          {/* Arrow / Connector */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-2 md:py-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet/40 bg-violet/10 text-violet shadow-lg">
              <ArrowRight className="h-5 w-5 md:rotate-0 rotate-90 transition-transform" />
            </div>
          </div>

          {/* Rescan Score */}
          <div className="md:col-span-3 rounded-2xl border border-border/60 bg-midnight/60 p-6 text-center shadow-inner backdrop-blur-sm">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
              {copy.dashboardComparisons.currentScore}
            </p>
            <p className="mt-2 font-heading text-4xl md:text-5xl font-extrabold text-ghost-white tracking-tight">
              {rescanScoreRound}
            </p>
            <p className="mt-2 text-xs font-mono text-muted-light">{rescanLabel}</p>
          </div>
        </div>

        {/* Delta Callout Bar */}
        <div className="mt-6 flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-2 text-sm font-semibold shadow-lg backdrop-blur-md ${
              deltaPositive
                ? "border-resolved/30 bg-[#E4F4EC] text-resolved-text"
                : deltaZero
                  ? "border-border/60 bg-midnight/80 text-ghost-white"
                  : "border-ember/25 bg-ember-soft text-ember-text"
            }`}
          >
            {deltaPositive ? (
              <TrendingUp className="h-4 w-4 text-resolved-text" />
            ) : deltaZero ? (
              <Sparkles className="h-4 w-4 text-muted-light" />
            ) : (
              <TrendingDown className="h-4 w-4 text-ember-text" />
            )}
            <span className="font-mono text-base font-bold">
              {deltaPositive ? `+${delta}` : delta}
            </span>
            <span className="font-mono text-xs uppercase tracking-wider opacity-80">
              {deltaPositive ? "IMPROVED" : deltaZero ? "UNCHANGED" : "DECLINED"}
            </span>
          </div>
        </div>
      </div>

      {/* SCORE DIMENSIONS TRANSFORMATION MAP */}
      {comparison.dimensions.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-border/70 bg-midnight/50 p-6 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h4 className="font-heading text-base font-bold text-ghost-white">
              {copy.dashboardComparisons.dimensions}
            </h4>
            <span className="text-xs font-mono text-muted">Baseline → Current</span>
          </div>

          <div className="grid gap-3">
            {comparison.dimensions.map((dim) => {
              const dimDelta = dim.delta;
              const dimPositive = dimDelta > 0;
              const dimZero = dimDelta === 0;

              return (
                <div
                  key={dim.id}
                  className="rounded-xl border border-border/50 bg-surface/30 p-4 transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-semibold text-ghost-white">{dim.label}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-muted-light">{dim.baseline} → {dim.rescan}</span>
                      <span
                        className={`font-bold ${
                          dimPositive
                            ? "text-resolved-text"
                            : dimZero
                              ? "text-muted"
                              : "text-ember-text"
                        }`}
                      >
                        {dimPositive ? `+${dimDelta}` : dimDelta}
                      </span>
                    </div>
                  </div>

                  {/* Dual progress bar visualizer */}
                  <div className="mt-2.5 space-y-1">
                    <div className="relative h-2 overflow-hidden rounded-full bg-midnight">
                      {/* Baseline indicator */}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-muted/40 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, dim.baseline))}%` }}
                      />
                      {/* Rescan indicator */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 rounded-full transition-all ${
                          dimPositive
                            ? "bg-resolved"
                            : "bg-ember"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, dim.rescan))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* GHOST SPOT TRANSFORMATION (3 COLUMNS) */}
      <section className="space-y-4">
        <h4 className="font-heading text-base font-bold text-ghost-white">
          WHAT CHANGED (GHOST SPOTS)
        </h4>

        <div className="grid gap-4 lg:grid-cols-3">
          <LeakList
            title={copy.dashboardComparisons.resolved}
            items={comparison.resolved}
            tone="green"
            badgeIcon={<CheckCircle2 className="h-4 w-4 text-resolved-text" />}
          />
          <LeakList
            title={copy.dashboardComparisons.persistent}
            items={comparison.persistent}
            tone="amber"
            badgeIcon={<AlertCircle className="h-4 w-4 text-sev-medium-text" />}
          />
          <LeakList
            title={copy.dashboardComparisons.newLeaks}
            items={comparison.newLeaks}
            tone="danger"
            badgeIcon={<AlertTriangle className="h-4 w-4 text-ember-text" />}
          />
        </div>
      </section>

      {/* VERIFIED FIXES SUCCESS BLOCK */}
      {verifiedFixes.length > 0 && (
        <section className="rounded-2xl border border-resolved/30 bg-[#E4F4EC] p-6 backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-center gap-2.5 text-resolved-text">
            <CheckCircle2 className="h-5 w-5 text-resolved-text" />
            <h4 className="font-heading text-base font-bold">
              {copy.dashboardComparisons.verifiedFixes}
            </h4>
          </div>
          <p className="text-xs text-resolved-text">Ghost confirmed these changes in the re-scan:</p>
          <ul className="grid gap-2 pt-1">
            {verifiedFixes.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-xl border border-resolved/30 bg-midnight/60 px-4 py-2.5 text-xs md:text-sm font-semibold text-ghost-white"
              >
                <CheckCircle2 className="h-4 w-4 text-resolved-text shrink-0" />
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function formatMissionLabel(auditType: string, createdAt: string | Date) {
  const label = AUDIT_TYPE_LABELS[auditType as AuditType] ?? auditType;
  const date = new Date(createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${label} · ${date}`;
}

