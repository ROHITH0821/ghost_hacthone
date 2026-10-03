"use client";

import { useState } from "react";
import { WebsiteIcon } from "@/components/ui/WebsiteIcon";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Minus, BarChart3 } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { Button } from "@/components/ui/Button";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import type { SiteDashboardRow } from "@/lib/db/sites";
import { PLAN_IDS, isPaidPlan } from "@/lib/plans";
import { copy } from "@/lib/copy";
import { Ga4ConnectionCard } from "@/components/dashboard/sites/Ga4ConnectionCard";

export function SiteCard({
  site,
  onArchiveToggle,
}: {
  site: SiteDashboardRow;
  onArchiveToggle: (siteId: string, action: "archive" | "unarchive") => void;
}) {
  const { openNewAudit } = useNewAudit();
  const isPaid = site.planId != null && isPaidPlan(site.planId);
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <article className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <WebsiteIcon src={site.faviconUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-ghost-white">{site.canonicalDomain}</h3>
            {site.displayName && (
              <span className="truncate text-sm text-muted">{site.displayName}</span>
            )}
          </div>
          <p className="mt-2 inline-flex rounded-full border border-violet/20 bg-violet/5 px-2.5 py-1 text-xs text-violet">
            {site.entitlementLabel}
          </p>
        </div>
        {site.latestScore != null && (
          <div className="text-right">
            <p className="font-heading text-2xl font-semibold text-ghost-white">
              {Math.round(site.latestScore)}
            </p>
            {site.scoreDelta != null && site.scoreDelta !== 0 && (
              <p
                className={`flex items-center justify-end gap-0.5 text-xs ${
                  site.scoreDelta > 0 ? "text-neon-green" : "text-danger"
                }`}
              >
                {site.scoreDelta > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(site.scoreDelta)}
              </p>
            )}
            {site.scoreDelta === 0 && (
              <p className="flex items-center justify-end text-xs text-muted">
                <Minus className="h-3 w-3" />
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-light">
        {site.lastScannedAt && (
          <span>
            {copy.dashboardSites.lastScan}{" "}
            <LocalTime date={site.lastScannedAt} />
          </span>
        )}
        {site.unresolvedCount > 0 && (
          <span className="text-danger/80">
            {site.unresolvedCount} {copy.dashboardSites.unresolved}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {site.latestMissionId && site.latestMissionStatus === "complete" && (
          <Link
            href={`/results/${site.latestMissionId}`}
            className="rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm text-ghost-white/80 hover:text-ghost-white"
          >
            {copy.dashboardSites.actions.viewReport}
          </Link>
        )}
        {isPaid && site.latestMissionId && (
          <a
            href={`/api/reports/${site.latestMissionId}/pdf?download=1`}
            className="flex items-center gap-1 rounded-xl border border-violet/40 bg-violet/10 px-3 py-2 text-sm text-violet"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            openNewAudit({
              url: `https://${site.canonicalDomain}`,
              siteId: site.id,
            })
          }
        >
          {copy.dashboardSites.actions.newAudit}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAnalytics((v) => !v)}
          className={`flex items-center gap-1.5 ${showAnalytics ? "bg-violet/20 text-violet" : ""}`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Google Analytics
        </Button>
        {!isPaid && site.planId === PLAN_IDS.free && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              openNewAudit({ url: `https://${site.canonicalDomain}`, siteId: site.id })
            }
          >
            {copy.dashboardSites.actions.purchase}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onArchiveToggle(site.id, site.archivedAt ? "unarchive" : "archive")
          }
        >
          {site.archivedAt
            ? copy.dashboardSites.actions.restore
            : copy.dashboardSites.actions.archive}
        </Button>
      </div>

      {showAnalytics && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <Ga4ConnectionCard siteId={site.id} />
        </div>
      )}
    </article>
  );
}
