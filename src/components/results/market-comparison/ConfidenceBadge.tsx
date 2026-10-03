"use client";

import type { ResolvedEvidence } from "@/lib/competitor-intelligence/evidence-resolver";
import { copy } from "@/lib/copy";
import { CheckCircle2, HelpCircle, AlertCircle, CircleDot } from "lucide-react";

export function confidenceLabel(status: ResolvedEvidence["status"]): string {
  switch (status) {
    case "verified":
      return copy.marketIntelligence.confidenceVerified;
    case "summarized":
      return copy.marketIntelligence.confidenceSummarized;
    case "inferred":
      return copy.marketIntelligence.confidenceInferred;
    case "score_only":
      return copy.marketIntelligence.confidenceScoreOnly;
    case "not_crawled":
      return copy.marketIntelligence.confidenceNotCrawled;
    default:
      return copy.marketIntelligence.confidenceNotObserved;
  }
}

export function ConfidenceBadge({ evidence }: { evidence: ResolvedEvidence }) {
  if (evidence.status === "not_observed" || evidence.status === "not_crawled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-midnight/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted">
        <HelpCircle className="h-2.5 w-2.5" />
        {confidenceLabel(evidence.status)}
      </span>
    );
  }

  const pct = Math.round(evidence.confidence * 100);
  const isHigh = pct >= 80;
  const isVerified = evidence.status === "verified";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
        isVerified || isHigh
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-violet/30 bg-violet/10 text-violet-300"
      }`}
      title={`${copy.marketIntelligence.evidenceConfidence}: ${pct}%`}
    >
      {isVerified ? (
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
      ) : (
        <CircleDot className="h-2.5 w-2.5 opacity-70" />
      )}
      <span>{confidenceLabel(evidence.status)}</span>
      <span className="opacity-40">·</span>
      <span className="font-mono">{pct}%</span>
    </span>
  );
}

