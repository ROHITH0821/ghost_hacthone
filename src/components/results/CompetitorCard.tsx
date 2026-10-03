"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { CompetitorProfileCard } from "@/lib/competitor-intelligence/comparison-view-model";
import { copy } from "@/lib/copy";

interface CompetitorCardProps {
  competitor: CompetitorProfileCard;
}

export function CompetitorCard({ competitor }: CompetitorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="flex flex-col rounded-2xl border border-border/60 bg-midnight/40 p-5">
      <header>
        <h4 className="font-heading text-lg font-semibold text-ghost-white">
          {competitor.name}
        </h4>
        <p className="mt-1 text-sm text-muted">
          {competitor.url.replace(/^https?:\/\//, "")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-light">
            {copy.marketIntelligence.relevance}:{" "}
            <span className="font-medium text-ghost-white">
              {competitor.relevanceScore}%
            </span>
          </span>
        </div>
      </header>

      <div className="mt-4 flex-1 space-y-4 text-sm">
        <div>
          <p className="font-medium text-muted-light">
            {copy.marketIntelligence.topStrengths}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-ghost-white/90">
            {(competitor.strengths.length
              ? competitor.strengths
              : [{ text: copy.marketIntelligence.noneListed, confidence: 0 }]
            ).map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-muted-light">
            {copy.marketIntelligence.weaknesses}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-ghost-white/90">
            {(competitor.weaknesses.length
              ? competitor.weaknesses
              : [{ text: copy.marketIntelligence.noneListed, confidence: 0 }]
            ).map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-sm text-violet"
      >
        {copy.marketIntelligence.viewEvidence}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && competitor.selectionReason && (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3 text-xs text-muted-light">
          <p>{competitor.selectionReason}</p>
        </div>
      )}
    </article>
  );
}
