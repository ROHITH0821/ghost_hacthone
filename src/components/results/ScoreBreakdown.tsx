"use client";

import type { GhostScoreBreakdown, GhostScoreDimension } from "@/lib/types";
import { industryBenchmarksEnabled } from "@/lib/benchmarks";
import { copy } from "@/lib/copy";

function barWidth(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  return `${v}%`;
}

function pointsLabel(points: number): string {
  const sign = points > 0 ? "+" : "";
  return `${sign}${points}`;
}

function DimensionRow({ dim }: { dim: GhostScoreDimension }) {
  return (
    <div className="rounded-2xl border border-ghost-white/10 bg-ghost-black/30 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-ghost-white">
            {dim.label}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Weight {Math.round(dim.weight * 100)}%
          </p>
        </div>
        <div className="flex-none text-right">
          <p className="font-heading text-lg font-bold text-ghost-white">{dim.value}</p>
          <p className="text-xs text-muted">/ 100</p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-ghost-white/10">
        <div
          className="h-2 rounded-full bg-ghost-white/70"
          style={{ width: barWidth(dim.value) }}
        />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer select-none text-xs text-ghost-white/60">
          Show checks
        </summary>
        <div className="mt-3 space-y-2">
          {dim.checks.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-ghost-white/10 bg-ghost-black/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-ghost-white/80">
                  {c.passed ? "✓ " : "✗ "}
                  {c.label}
                </p>
                <p
                  className={`flex-none text-xs font-semibold ${
                    c.points >= 0 ? "text-ghost-white/80" : "text-ghost-white/60"
                  }`}
                >
                  {pointsLabel(c.points)}
                </p>
              </div>
              {c.evidence ? (
                <p className="mt-1 text-xs text-muted-light">{c.evidence}</p>
              ) : null}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function ScoreBreakdown({
  breakdown,
  showBenchmarkPlaceholder = false,
}: {
  breakdown: GhostScoreBreakdown;
  showBenchmarkPlaceholder?: boolean;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-semibold text-ghost-white">
            Score breakdown
          </p>
          <p className="mt-1 text-sm text-muted">
            {breakdown.band === "NeedsImprovement" ? "Needs improvement" : breakdown.band} · scoring version {breakdown.version}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-2xl font-bold text-ghost-white">
            {breakdown.value}
          </p>
          <p className="text-xs text-muted">/ 100</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {breakdown.dimensions.map((dim) => (
          <DimensionRow key={dim.id} dim={dim} />
        ))}
      </div>

      {showBenchmarkPlaceholder && !industryBenchmarksEnabled() && (
        <div className="mt-6 rounded-2xl border border-border/40 bg-midnight/40 p-4">
          <p className="text-sm font-medium text-ghost-white/80">
            {copy.dashboardBenchmarks.title}
          </p>
          <p className="mt-2 text-xs text-muted">{copy.dashboardBenchmarks.placeholder}</p>
        </div>
      )}
    </div>
  );
}

