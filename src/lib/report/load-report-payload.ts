import { getReport } from "@/lib/api/ghost-api";
import { hasCompetitorIntelligenceAccess } from "@/lib/competitor-intelligence/access";
import { serializeMarketComparisonViewModel } from "@/lib/competitor-intelligence/serialize-view-model";
import { parseCompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import {
  getCompetitorIntelligenceForMission,
  getMissionAuditConfigSnapshot,
  getMissionIntelMeta,
  type IntelStatus,
} from "@/lib/db/missions";
import { getEntitlementForMission } from "@/lib/db/entitlements";
import {
  filterReportForViewMode,
  getReportViewMode,
  type ReportViewMode,
} from "@/lib/entitlements/report-access";
import type { AuditConfigSnapshot } from "@/lib/audit-config/types";
import type { GhostReport } from "@/lib/types";
import type { PlanId } from "@/lib/plans";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { getSnapshotForSite } from "@/lib/data-sources/ga4/sync";
import { buildExternalEvidence } from "@/lib/data-sources/ga4/evidence";
import { db } from "@/lib/db";
import { cache } from "react";

export type ReportPayload = {
  report: GhostReport;
  viewMode: ReportViewMode;
  auditConfigSnapshot: AuditConfigSnapshot | null;
  competitorIntelligence: CompetitorIntelligence | null;
  marketComparison: ReturnType<typeof serializeMarketComparisonViewModel> | null;
  intelStatus?: IntelStatus | null;
  intelError?: string | null;
  marketIntelExpected: boolean;
  hasCompetitorCrawlPacks: boolean;
  /** GA4 analytics evidence — null when GA4 is not connected or unavailable. */
  analyticsEvidence?: ExternalEvidence | null;
  siteId?: string | null;
};

/**
 * The full report payload for a mission, shared by `/api/reports/[id]` and the
 * `/results/[id]` server component so the page can render its report in the
 * first response instead of fetching it after hydration.
 *
 * Request-scoped so a page and any API work in the same request share one load.
 * Callers must have already checked mission access.
 */
export const loadReportPayload = cache(
  async (missionId: string): Promise<ReportPayload | null> => {
    const [report, entitlement, auditConfigSnapshot, intelMeta] = await Promise.all([
      getReport(missionId),
      getEntitlementForMission(missionId),
      getMissionAuditConfigSnapshot(missionId),
      getMissionIntelMeta(missionId),
    ]);

    if (!report) return null;

    const viewMode = entitlement
      ? getReportViewMode(entitlement.planId as PlanId, entitlement.auditType)
      : "full";
    const filtered = filterReportForViewMode(report, viewMode);

    let competitorIntelligence: CompetitorIntelligence | null = null;
    let marketComparison: ReportPayload["marketComparison"] = null;

    if (
      entitlement &&
      hasCompetitorIntelligenceAccess({
        planId: entitlement.planId as PlanId,
        auditType: entitlement.auditType,
      })
    ) {
      const intelRow = await getCompetitorIntelligenceForMission(missionId);
      competitorIntelligence = parseCompetitorIntelligence(
        intelRow?.competitorIntelligence
      );
      if (competitorIntelligence) {
        marketComparison = serializeMarketComparisonViewModel(
          competitorIntelligence
        );
      }
    }

    // --- GA4 Analytics Evidence (optional, non-blocking) --------------------
    let analyticsEvidence: ExternalEvidence | null = null;
    let siteId: string | null = null;
    try {
      // Resolve the mission's site to look up its DataSourceConnection.
      const mission = await db.mission.findUnique({
        where: { id: missionId },
        select: { siteId: true },
      });
      siteId = mission?.siteId ?? null;
      if (siteId) {
        const snapshot = await getSnapshotForSite(siteId);
        if (snapshot) {
          analyticsEvidence = buildExternalEvidence(snapshot, filtered);
        }
      }
    } catch {
      // GA4 evidence is always optional — failures must never break the report.
    }

    return {
      report: filtered,
      viewMode,
      auditConfigSnapshot,
      competitorIntelligence,
      marketComparison,
      intelStatus: intelMeta?.intelStatus ?? null,
      intelError: intelMeta?.intelError ?? null,
      marketIntelExpected: intelMeta?.marketIntelExpected ?? false,
      hasCompetitorCrawlPacks: intelMeta?.hasCompetitorCrawlPacks ?? false,
      analyticsEvidence,
      siteId,
    };
  }
);
