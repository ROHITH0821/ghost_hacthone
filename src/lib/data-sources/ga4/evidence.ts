/**
 * GA4 Evidence Layer
 *
 * Maps a cached AnalyticsSnapshot onto Ghost report findings, producing
 * per-finding evidence that distinguishes ACTUAL DATA from OBSERVATION,
 * AI INTERPRETATION, and RECOMMENDATION.
 *
 * The pipeline also uses a bounded traffic supplement during aggregation/fixes.
 * This layer retains the separate measured-evidence overlay for completed reports.
 */

import type { AnalyticsSnapshot, ExternalEvidence, FindingEvidence } from "../types";
import { matchTrafficPage, normalizePath } from "./traffic-supplement";
import type { GhostReport, ConversionLeak } from "@/lib/types";

// ---------------------------------------------------------------------------
// Evidence builder
// ---------------------------------------------------------------------------

function formatNumber(n: number | null): string {
  if (n === null) return "unavailable";
  return n.toLocaleString("en-US");
}

function formatPercent(n: number | null): string {
  if (n === null) return "unavailable";
  // GA4 returns engagement rate as a decimal (0.72 = 72%).
  if (n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

function formatRate(n: number | null): string {
  if (n === null) return "unavailable";
  if (n <= 1) return `${(n * 100).toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
}

/**
 * Build evidence for a single finding by matching its page to GA4 data.
 */
function buildFindingEvidence(
  leak: ConversionLeak,
  snapshot: AnalyticsSnapshot,
  totalSessions: number | null,
): FindingEvidence | null {
  const allPages = [...snapshot.pages, ...snapshot.landingPages];
  // The adapter retains LeakSchema.page in category; treat it as the primary location.
  const matchedPath = matchTrafficPage({ ...leak, page: leak.category }, allPages);

  if (!matchedPath) return null;

  // Try to match in pages data.
  const pageMatches = snapshot.pages.filter((p) => normalizePath(p.path) === matchedPath);
  const pageMatch = pageMatches.length === 1 ? pageMatches[0] : null;

  // Try to match in landing pages data.
  const landingMatches = snapshot.landingPages.filter((p) => normalizePath(p.path) === matchedPath);
  const landingMatch = landingMatches.length === 1 ? landingMatches[0] : null;

  if (!pageMatch && !landingMatch) return null;

  const views = pageMatch?.views ?? null;
  const landingSessions = landingMatch?.sessions ?? null;
  const engagementRate = landingMatch?.engagementRate ?? null;
  const sessionKeyEventRate = landingMatch?.sessionKeyEventRate ?? null;

  // Build observation — factual statement from data.
  const parts: string[] = [];
  if (views !== null) {
    const viewShare = totalSessions && totalSessions > 0 ? ` (${((views / totalSessions) * 100).toFixed(1)}% of site page views)` : "";
    parts.push(`This page received ${formatNumber(views)} page views during the selected period${viewShare}.`);
  }
  if (landingSessions !== null) {
    parts.push(`${formatNumber(landingSessions)} sessions started on this page.`);
  }
  if (engagementRate !== null) {
    const siteAvg = snapshot.current.engagementRate;
    const comparison = siteAvg !== null
      ? engagementRate < siteAvg
        ? ` (below site average of ${formatPercent(siteAvg)})`
        : engagementRate > siteAvg
          ? ` (above site average of ${formatPercent(siteAvg)})`
          : ` (at site average)`
      : "";
    parts.push(`Engagement rate: ${formatPercent(engagementRate)}${comparison}.`);
  }

  const observation = parts.join(" ");

  // Build interpretation — what the data might mean.
  let interpretation: string | undefined;
  if (views !== null && views > 100) {
    interpretation = "This page receives meaningful traffic, so improvements here could affect a significant number of visitors.";
  } else if (views !== null && views > 0) {
    interpretation = "This page receives some traffic. Improvements would have a modest impact based on current volume.";
  }

  // Build recommendation (context-aware).
  let recommendation: string;
  if (sessionKeyEventRate !== null && sessionKeyEventRate < 0.01 && landingSessions !== null && landingSessions > 50) {
    recommendation = "This page has significant traffic but a very low conversion rate. Prioritize testing clearer CTAs and reducing friction.";
  } else if (engagementRate !== null && engagementRate < 0.3 && views !== null && views > 100) {
    recommendation = "Engagement is low relative to traffic. Consider improving content relevance, page speed, or above-the-fold clarity.";
  } else {
    recommendation = "Review the page evidence and assess whether the identified issue aligns with the traffic patterns shown.";
  }

  return {
    findingId: leak.id,
    path: matchedPath,
    views,
    landingSessions,
    engagementRate,
    sessionKeyEventRate,
    observation,
    interpretation,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build ExternalEvidence from an AnalyticsSnapshot and a GhostReport.
 *
 * Returns null if the snapshot has no useful data.
 */
export function buildExternalEvidence(
  snapshot: AnalyticsSnapshot,
  report: GhostReport,
): ExternalEvidence | null {
  if (!snapshot.reliable && snapshot.notes.length > 0) {
    // Even unreliable data can provide some context — we still generate
    // evidence but the UI should note the reliability.
  }

  const totalSessions = snapshot.current.sessions;
  const totalViews = snapshot.current.views;

  // Build evidence for each finding.
  const findings: FindingEvidence[] = [];
  for (const leak of report.leaks) {
    const evidence = buildFindingEvidence(leak, snapshot, totalViews);
    if (evidence) findings.push(evidence);
  }

  // Priority finding IDs: findings on pages with significant traffic.
  const priorityFindingIds = findings
    .filter((f) => (f.views ?? 0) > 100 || (f.landingSessions ?? 0) > 50)
    .map((f) => f.findingId);

  // Active user change percent.
  let activeUserChangePercent: number | null = null;
  if (
    snapshot.current.activeUsers !== null &&
    snapshot.previous?.activeUsers !== null &&
    snapshot.previous?.activeUsers !== undefined &&
    snapshot.previous.activeUsers > 0
  ) {
    activeUserChangePercent = Math.round(
      ((snapshot.current.activeUsers - snapshot.previous.activeUsers) / snapshot.previous.activeUsers) * 100,
    );
  }

  return {
    snapshot,
    findings,
    priorityFindingIds,
    activeUserChangePercent,
  };
}

/**
 * Format the analytics period for display.
 * Returns e.g. "Sep 1 – Sep 30, 2026"
 */
export function formatPeriod(period: { start: string; end: string }): string {
  try {
    const start = new Date(period.start + "T00:00:00Z");
    const end = new Date(period.end + "T00:00:00Z");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = start.toLocaleDateString("en-US", opts);
    const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
    return `${startStr} – ${endStr}`;
  } catch {
    return `${period.start} – ${period.end}`;
  }
}
