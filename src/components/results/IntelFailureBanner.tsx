"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { copy } from "@/lib/copy";

type IntelFailureBannerProps = {
  missionId: string;
  hasCompetitorCrawlPacks: boolean;
  intelError?: string | null;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onNewAudit?: () => void;
};

export function IntelFailureBanner({
  missionId,
  hasCompetitorCrawlPacks,
  intelError,
  onRegenerate,
  regenerating,
  onNewAudit,
}: IntelFailureBannerProps) {
  const [localRegenerating, setLocalRegenerating] = useState(false);
  const isRegenerating = regenerating ?? localRegenerating;

  async function handleRegenerate() {
    if (onRegenerate) {
      onRegenerate();
      return;
    }

    setLocalRegenerating(true);
    try {
      await fetch(`/api/missions/${missionId}/regenerate-market-intelligence`, {
        method: "POST",
      });
    } finally {
      setLocalRegenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-amber-100">
            {copy.marketIntelligence.intelFailureTitle}
          </p>
          <p className="text-sm text-amber-100/90">
            {copy.marketIntelligence.intelFailureBody}
          </p>
          {intelError && (
            <p className="text-xs text-amber-200/70 font-mono break-all">{intelError}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {hasCompetitorCrawlPacks ? (
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => void handleRegenerate()}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-50 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                {copy.marketIntelligence.intelFailureRegenerateCta}
              </button>
            ) : onNewAudit ? (
              <button
                type="button"
                onClick={onNewAudit}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-50 transition-colors hover:bg-amber-500/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {copy.marketIntelligence.intelFailureNewAuditCta}
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-50 transition-colors hover:bg-amber-500/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {copy.marketIntelligence.intelFailureNewAuditCta}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
