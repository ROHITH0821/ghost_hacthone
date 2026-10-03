"use client";

import { useState } from "react";
import type {
  CompetitorProfileCard,
  ThemeComparison,
  ThemeSummary,
} from "@/lib/competitor-intelligence/comparison-view-model";
import { FEATURE_BY_ID } from "@/lib/competitor-intelligence/feature-taxonomy";
import type {
  ThemeSide,
  ThemeStanding,
} from "@/lib/competitor-intelligence/theme-builder";
import { copy } from "@/lib/copy";
import { ChevronDown, ExternalLink, ShieldAlert, ShieldCheck, ArrowRightLeft, Layers, BarChart2 } from "lucide-react";

import { ConfidenceBadge } from "./ConfidenceBadge";

function ThemeSideCell({
  side,
  label,
  isOwner = false,
}: {
  side: ThemeSide;
  label: string;
  isOwner?: boolean;
}) {
  const empty = side.status === "not_observed" || side.status === "not_crawled";
  const { evidence } = side;

  return (
    <div
      className={`rounded-xl border p-4 backdrop-blur-sm ${
        isOwner
          ? "border-violet/25 bg-violet/5"
          : "border-border/60 bg-midnight/40"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-white/90 font-mono flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isOwner ? "bg-violet" : "bg-blue-400"}`} />
          {label}
        </p>
        <ConfidenceBadge evidence={evidence} />
      </div>

      {empty ? (
        <p className="mt-3 text-xs italic text-muted">
          {side.status === "not_crawled"
            ? copy.marketIntelligence.confidenceNotCrawled
            : copy.marketIntelligence.confidenceNotObserved}
        </p>
      ) : (
        <>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-light">{copy.marketIntelligence.themeScoreLabel}</span>
              <span className="font-mono font-bold text-ghost-white">
                {side.score != null ? `${Math.round(side.score)} / 100` : copy.marketIntelligence.unknownDash}
              </span>
            </div>
            {side.score != null && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-midnight">
                <div
                  className={`h-full rounded-full ${isOwner ? "bg-gradient-to-r from-violet to-violet-glow" : "bg-gradient-to-r from-blue-500 to-ai-blue"}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, side.score))}%`,
                  }}
                />
              </div>
            )}
          </div>

          {evidence.quote && (
            <p className="mt-3 rounded-lg border border-border/40 bg-midnight/60 p-2.5 text-xs italic leading-relaxed text-ghost-white/90">
              &ldquo;{evidence.quote}&rdquo;
            </p>
          )}

          {!evidence.quote && evidence.explanation && (
            <p className="mt-3 text-xs leading-relaxed text-muted-light">{evidence.explanation}</p>
          )}

          {evidence.sourceUrl && (
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet hover:text-violet-glow hover:underline"
            >
              <span>{evidence.sourceUrl.replace(/^https?:\/\//, "").slice(0, 40)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </div>
  );
}

function standingBadgeClass(standing: ThemeStanding): string {
  switch (standing) {
    case "behind":
      return "border-ember/25 bg-ember-soft text-ember-text font-semibold";
    case "ahead":
      return "border-resolved/30 bg-[#E4F4EC] text-resolved-text font-semibold";
    case "similar":
      return "border-border/60 bg-midnight/60 text-muted-light font-medium";
    default:
      return "border-border/50 bg-transparent text-muted font-normal";
  }
}

function standingLabel(standing: ThemeStanding): string {
  switch (standing) {
    case "behind":
      return copy.marketIntelligence.standingBehind;
    case "ahead":
      return copy.marketIntelligence.standingAhead;
    case "similar":
      return copy.marketIntelligence.standingSimilar;
    default:
      return copy.marketIntelligence.standingUnknown;
  }
}

interface SideBySideCompareProps {
  competitors: CompetitorProfileCard[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  rows: ThemeComparison[];
  summary: ThemeSummary;
  needsRegen: boolean;
}

function qualityHint(q: CompetitorProfileCard["crawlQuality"]): string {
  if (q === "good") return copy.marketIntelligence.crawlQualityGood;
  if (q === "weak") return copy.marketIntelligence.crawlQualityWeak;
  return copy.marketIntelligence.crawlQualityPartial;
}

function ThemeAccordionItem({ row, defaultOpen }: { row: ThemeComparison; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const includes = row.memberFeatureIds
    .map((id) => FEATURE_BY_ID.get(id)?.label ?? id)
    .join(", ");

  return (
    <article className="rounded-2xl border border-border/70 bg-midnight/50 transition-all backdrop-blur-md shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-surface/20 rounded-2xl"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="font-heading text-base font-semibold text-ghost-white md:text-lg">
            {row.title}
          </h4>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-mono ${standingBadgeClass(row.standing)}`}
          >
            {standingLabel(row.standing)}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border/50 bg-midnight/80 px-2.5 py-0.5 text-[10px] font-mono text-muted-light">
            <span>Conf.</span>
            <span className="font-semibold text-ghost-white">{Math.round(row.confidence * 100)}%</span>
          </span>
          <ChevronDown
            className={`h-5 w-5 text-muted transition-transform duration-200 ${open ? "rotate-180 text-violet" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/40 p-5 pt-4">
          {includes && (
            <p className="text-xs text-muted-light flex items-center gap-1.5 font-mono">
              <Layers className="h-3.5 w-3.5 text-violet shrink-0" />
              <span>{copy.marketIntelligence.themeIncludes}: {includes}</span>
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <ThemeSideCell
              side={row.owner}
              label={copy.marketIntelligence.youLabel}
              isOwner
            />
            <ThemeSideCell
              side={row.competitor}
              label={copy.marketIntelligence.competitorLabel}
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-border/40 bg-surface/30 p-4 text-xs md:text-sm">
            <div>
              <p className="label-caps text-[10px] tracking-wider text-muted font-mono uppercase">
                {copy.marketIntelligence.whyItMatters}
              </p>
              <p className="mt-1 leading-relaxed text-ghost-white/90">{row.whyItMatters}</p>
            </div>
            <div>
              <p className="label-caps text-[10px] tracking-wider text-violet-glow font-mono uppercase">
                {copy.marketIntelligence.actionLabel}
              </p>
              <p className="mt-1 font-semibold leading-relaxed text-ghost-white">{row.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function SideBySideCompare({
  competitors,
  selectedUrl,
  onSelect,
  rows,
  summary,
  needsRegen,
}: SideBySideCompareProps) {
  const currentCompetitor = competitors.find((c) => c.url === selectedUrl) ?? competitors[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-violet" />
            <h3 className="font-heading text-xl font-bold text-ghost-white">
              {copy.marketIntelligence.sideBySideTitle}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            Side-by-side evidence analysis across key market themes
          </p>
        </div>

        {competitors.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-light">
              <span className="font-mono uppercase tracking-wider">{copy.marketIntelligence.compareAgainst}:</span>
              <div className="relative">
                <select
                  value={selectedUrl ?? ""}
                  onChange={(e) => onSelect(e.target.value)}
                  className="appearance-none rounded-xl border border-border/80 bg-surface-elevated/90 px-3.5 py-2 pr-9 text-xs font-semibold text-ghost-white focus:border-violet/60 focus:outline-none focus:ring-1 focus:ring-violet/40 shadow-inner"
                >
                  {competitors.map((c) => (
                    <option key={c.id} value={c.url} className="bg-midnight text-ghost-white">
                      {c.name} · {qualityHint(c.crawlQuality)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-muted" />
              </div>
            </label>

            {currentCompetitor && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border/60 bg-midnight/80 px-2.5 py-1 text-[10px] font-mono text-muted-light">
                <span>Crawl:</span>
                <span className="font-semibold text-ghost-white capitalize">{currentCompetitor.crawlQuality}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {needsRegen ? (
        <p className="rounded-xl border border-sev-medium/35 bg-[#FEF3E2] p-4 text-sm text-sev-medium-text">
          {copy.marketIntelligence.needsRegenSideBySide}
        </p>
      ) : competitors.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-midnight/40 p-6 text-center text-sm text-muted">
          {copy.marketIntelligence.fairSetUnavailable}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-midnight/40 p-6 text-center text-sm text-muted">
          {copy.marketIntelligence.thinEvidenceSideBySide}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Metrics summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/60 bg-midnight/40 p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted">Themes Compared</p>
              <p className="mt-1 font-heading text-lg font-bold text-ghost-white">{summary.themeCount}</p>
            </div>
            <div className="rounded-xl border border-ember/25 bg-ember-soft p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ember-text">Behind</p>
              <p className="mt-1 font-heading text-lg font-bold text-ember-text">{summary.behind}</p>
            </div>
            <div className="rounded-xl border border-resolved/30 bg-[#E4F4EC] p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-wider text-resolved-text">Ahead</p>
              <p className="mt-1 font-heading text-lg font-bold text-resolved-text">{summary.ahead}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-midnight/40 p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-light">Similar</p>
              <p className="mt-1 font-heading text-lg font-bold text-ghost-white">{summary.similar}</p>
            </div>
          </div>

          {/* Theme Accordion List */}
          <div className="space-y-3 pt-2">
            {rows.map((row, idx) => (
              <ThemeAccordionItem key={row.themeId} row={row} defaultOpen={idx === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

