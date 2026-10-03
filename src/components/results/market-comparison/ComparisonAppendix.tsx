"use client";

import { useState } from "react";
import { ChevronDown, TableProperties, HelpCircle } from "lucide-react";

import type { AppendixRow } from "@/lib/competitor-intelligence/comparison-view-model";
import { hasRenderableEvidence } from "@/lib/competitor-intelligence/evidence-resolver";
import { copy } from "@/lib/copy";

import { ConfidenceBadge } from "./ConfidenceBadge";

interface ComparisonAppendixProps {
  rows: AppendixRow[];
  canClaimMarketAverage: boolean;
}

export function ComparisonAppendix({
  rows,
  canClaimMarketAverage,
}: ComparisonAppendixProps) {
  const [open, setOpen] = useState(false);

  if (!canClaimMarketAverage) {
    return (
      <p className="rounded-xl border border-border/60 bg-midnight/40 p-4 text-center text-xs text-muted">
        {copy.marketIntelligence.fairSetUnavailable}
      </p>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-midnight/50 backdrop-blur-md overflow-hidden transition-all shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-surface/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet/30 bg-violet/10 text-violet">
            <TableProperties className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-heading text-base font-bold text-ghost-white">
              {copy.marketIntelligence.appendixTitle}
            </h4>
            <p className="text-xs text-muted font-mono mt-0.5">{copy.marketIntelligence.appendixHint}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180 text-violet" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/40 p-5 pt-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface/30">
            <table className="w-full text-left text-xs font-sans">
              <thead className="border-b border-border/50 bg-midnight/80 font-mono uppercase tracking-wider text-[10px] text-muted-light">
                <tr>
                  <th className="px-4 py-3 font-semibold">{copy.marketIntelligence.feature}</th>
                  <th className="px-4 py-3 font-semibold text-center">{copy.marketIntelligence.youVsMarketYou}</th>
                  <th className="px-4 py-3 font-semibold text-center">{copy.marketIntelligence.youVsMarketMarket}</th>
                  <th className="px-4 py-3 font-semibold text-center">{copy.marketIntelligence.youVsMarketDelta}</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    {copy.marketIntelligence.evidenceConfidence}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-medium">
                {rows.map((row) => {
                  const ownerDisplay =
                    hasRenderableEvidence(row.owner) || row.owner.status === "score_only"
                      ? row.owner.score != null
                        ? Math.round(row.owner.score)
                        : copy.marketIntelligence.unknownDash
                      : copy.marketIntelligence.unknownDash;

                  const deltaVal = row.delta != null ? Math.round(row.delta) : null;
                  const deltaClass =
                    deltaVal == null
                      ? "text-muted"
                      : deltaVal > 0
                        ? "text-emerald-400 font-bold"
                        : deltaVal < 0
                          ? "text-red-400 font-bold"
                          : "text-muted-light font-bold";

                  return (
                    <tr key={row.featureId} className="hover:bg-midnight/40 transition-colors">
                      <td className="px-4 py-3 text-ghost-white font-semibold">{row.label}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-ghost-white">
                        {ownerDisplay}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-muted-light">
                        {row.marketScore != null
                          ? Math.round(row.marketScore)
                          : copy.marketIntelligence.unknownDash}
                      </td>
                      <td className={`px-4 py-3 text-center font-mono ${deltaClass}`}>
                        {deltaVal == null
                          ? copy.marketIntelligence.unknownDash
                          : deltaVal > 0
                            ? `+${deltaVal}`
                            : String(deltaVal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ConfidenceBadge evidence={row.owner} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

