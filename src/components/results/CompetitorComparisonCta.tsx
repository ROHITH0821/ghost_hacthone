"use client";

import Link from "next/link";

import { copy } from "@/lib/copy";
import { dashboardComparisonsHref } from "@/lib/auth/new-audit-href";

interface CompetitorComparisonCtaProps {
  /** When false, use softer body copy (no inline market intel on this page). */
  hasInlineIntel?: boolean;
  /** Mission id for “open full report” on mission page */
  fullReportHref?: string | null;
  /** Show jump link to #market-intelligence when inline section exists */
  showJumpToMarket?: boolean;
  /** Open Comparisons with this site selected (siteId or domain). */
  siteKey?: string | null;
}

export function CompetitorComparisonCta({
  hasInlineIntel = false,
  fullReportHref = null,
  showJumpToMarket = false,
  siteKey = null,
}: CompetitorComparisonCtaProps) {
  return (
    <div className="rounded-2xl border border-violet/30 bg-violet/10 px-5 py-5 md:px-6 md:py-6">
      <p className="font-heading text-lg font-semibold text-ghost-white">
        {copy.results.competitorComparisonCta}
      </p>
      <p className="mt-2 max-w-2xl text-sm text-muted-light">
        {hasInlineIntel
          ? copy.results.competitorComparisonCtaBody
          : copy.results.competitorComparisonCtaNoIntel}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={dashboardComparisonsHref(siteKey)}
          className="inline-flex items-center rounded-xl border border-violet/50 bg-violet/20 px-4 py-2.5 text-sm font-medium text-violet-glow transition-colors hover:border-violet/70 hover:bg-violet/30"
        >
          {copy.results.competitorComparisonCta}
        </Link>
        {showJumpToMarket && hasInlineIntel && (
          <a
            href="#market-intelligence"
            className="text-sm text-muted underline-offset-4 hover:text-ghost-white hover:underline"
          >
            {copy.results.jumpToMarketIntelligence}
          </a>
        )}
        {fullReportHref && (
          <Link
            href={fullReportHref}
            className="text-sm text-muted underline-offset-4 hover:text-ghost-white hover:underline"
          >
            {copy.results.openFullReport}
          </Link>
        )}
      </div>
    </div>
  );
}
