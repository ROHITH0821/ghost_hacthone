"use client";

import { BarChart3 } from "lucide-react";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { formatPeriod } from "@/lib/data-sources/ga4/evidence";

/**
 * Banner shown at the top of the report when GA4 evidence is available.
 * Clearly communicates the data source and time period.
 */
export function AnalyticsEvidenceBanner({ evidence }: { evidence: ExternalEvidence }) {
  const { snapshot } = evidence;
  const period = formatPeriod(snapshot.period);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet/20 bg-violet/5 px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-violet">
        <BarChart3 className="h-4 w-4" />
        Enhanced with GA4 data
      </span>
      <span className="text-muted-light">·</span>
      <span className="text-muted-light">{period}</span>
      <span className="text-muted-light">·</span>
      <span className="text-xs text-muted">Source: Google Analytics 4</span>
      {!snapshot.reliable && (
        <>
          <span className="text-muted-light">·</span>
          <span className="text-xs text-warning">Limited data</span>
        </>
      )}
    </div>
  );
}
