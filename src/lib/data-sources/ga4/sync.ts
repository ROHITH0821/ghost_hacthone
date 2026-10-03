/**
 * GA4 Sync Service
 *
 * Fetches analytics data from the GA4 Data API, normalizes it into an
 * AnalyticsSnapshot, and persists the result on the DataSourceConnection row.
 *
 * All data retrieval happens server-side. The snapshot is a provider-neutral
 * contract (defined in ../types.ts) so the rest of Ghost never touches Google
 * API shapes directly.
 *
 * Design principles:
 * - Never fabricate metrics. Missing data → null values + notes.
 * - Every GA4 report call uses the validated GoogleAnalyticsApi client.
 * - Lease-based locking prevents concurrent syncs on the same connection.
 * - Refresh tokens are sealed at rest (AES-256-GCM with AAD binding).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { GoogleAnalyticsApi, type DataReport } from "./google";
import { unseal, safeError, type AnalyticsError } from "./security";
import type { AnalyticsSnapshot, AnalyticsMetrics } from "../types";
import { snapshotSchema } from "../types";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function datePeriod(daysBack: number, rangeDays: number, tz: string) {
  // Anchor "today" in the property's time zone when possible.
  const now = new Date();
  // Fallback: use UTC if Intl is unavailable for the time zone.
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const anchor = new Date(parts + "T00:00:00Z");
    const end = new Date(anchor.getTime() - daysBack * 86_400_000);
    const start = new Date(end.getTime() - (rangeDays - 1) * 86_400_000);
    return { start: formatDate(start), end: formatDate(end) };
  } catch {
    const end = new Date(now.getTime() - daysBack * 86_400_000);
    const start = new Date(end.getTime() - (rangeDays - 1) * 86_400_000);
    return { start: formatDate(start), end: formatDate(end) };
  }
}

// ---------------------------------------------------------------------------
// GA4 report query builders
// ---------------------------------------------------------------------------

function overviewReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    metrics: [
      { name: "activeUsers" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "engagementRate" },
      { name: "userEngagementDuration" },
      { name: "keyEvents" },
      { name: "sessionKeyEventRate" },
    ],
  };
}

function pagesReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 100,
  };
}

function landingPagesReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    dimensions: [{ name: "landingPage" }],
    metrics: [
      { name: "sessions" },
      { name: "engagementRate" },
      { name: "sessionKeyEventRate" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 100,
  };
}

function acquisitionReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  };
}

function devicesReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  };
}

function eventsReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "keyEvents" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 50,
  };
}

function revenueReportBody(dateRange: { start: string; end: string }) {
  return {
    dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
    metrics: [
      { name: "transactions" },
      { name: "purchaseRevenue" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Report parsers
// ---------------------------------------------------------------------------

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseOverview(report: DataReport): AnalyticsMetrics {
  const row = report.rows?.[0];
  const vals = row?.metricValues ?? [];
  return {
    activeUsers: num(vals[0]?.value),
    totalUsers: num(vals[1]?.value),
    newUsers: num(vals[2]?.value),
    sessions: num(vals[3]?.value),
    views: num(vals[4]?.value),
    engagementRate: num(vals[5]?.value),
    engagementSeconds: num(vals[6]?.value),
    keyEvents: num(vals[7]?.value),
    sessionKeyEventRate: num(vals[8]?.value),
  };
}

function parsePages(report: DataReport): { path: string; views: number | null }[] {
  return (report.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "/",
    views: num(row.metricValues?.[0]?.value),
  }));
}

function parseLandingPages(report: DataReport): {
  path: string;
  sessions: number | null;
  engagementRate: number | null;
  sessionKeyEventRate: number | null;
}[] {
  return (report.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "/",
    sessions: num(row.metricValues?.[0]?.value),
    engagementRate: num(row.metricValues?.[1]?.value),
    sessionKeyEventRate: num(row.metricValues?.[2]?.value),
  }));
}

function parseAcquisition(report: DataReport): { source: string; medium: string; sessions: number | null }[] {
  return (report.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? "(not set)",
    medium: row.dimensionValues?.[1]?.value ?? "(not set)",
    sessions: num(row.metricValues?.[0]?.value),
  }));
}

function parseDevices(report: DataReport): { category: string; sessions: number | null }[] {
  return (report.rows ?? []).map((row) => ({
    category: row.dimensionValues?.[0]?.value ?? "unknown",
    sessions: num(row.metricValues?.[0]?.value),
  }));
}

function parseEvents(report: DataReport): { name: string; count: number | null; keyEvents: number | null }[] {
  return (report.rows ?? []).map((row) => ({
    name: row.dimensionValues?.[0]?.value ?? "",
    count: num(row.metricValues?.[0]?.value),
    keyEvents: num(row.metricValues?.[1]?.value),
  }));
}

function parseRevenue(report: DataReport): { purchases: number | null; purchaseRevenue: number | null; currency: string | null } {
  const row = report.rows?.[0];
  return {
    purchases: num(row?.metricValues?.[0]?.value),
    purchaseRevenue: num(row?.metricValues?.[1]?.value),
    currency: report.metadata?.currencyCode ?? null,
  };
}

// ---------------------------------------------------------------------------
// Sync core
// ---------------------------------------------------------------------------

const RANGE_DAYS = 30;
const LEASE_SECONDS = 180; // max sync duration
const MIN_SYNC_INTERVAL_MS = 60_000; // debounce rapid retriggers

/**
 * Fetch GA4 data for a DataSourceConnection and persist the snapshot.
 *
 * Returns the snapshot on success, or throws an AnalyticsError.
 *
 * The caller is responsible for catching errors and updating the connection's
 * status/lastError fields.
 */
export async function syncConnection(connectionId: string): Promise<AnalyticsSnapshot> {
  const conn = await db.dataSourceConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error("Connection not found");
  if (conn.status === "disconnected") throw new Error("Connection is disconnected");

  // Debounce: skip if we synced very recently.
  if (conn.lastSyncedAt && Date.now() - conn.lastSyncedAt.getTime() < MIN_SYNC_INTERVAL_MS) {
    if (conn.snapshot) return snapshotSchema.parse(conn.snapshot);
    // No cached snapshot — fall through and sync.
  }

  // Lease: prevent concurrent syncs.
  const leaseToken = randomBytes(16).toString("hex");
  const leaseUntil = new Date(Date.now() + LEASE_SECONDS * 1000);
  const leased = await db.dataSourceConnection.updateMany({
    where: {
      id: connectionId,
      OR: [
        { leaseToken: null },
        { leaseUntil: { lt: new Date() } },
      ],
    },
    data: { leaseToken, leaseUntil },
  });
  if (leased.count === 0) throw new Error("Sync lease busy");

  const api = new GoogleAnalyticsApi();

  try {
    // 1. Refresh the access token.
    const refreshToken = unseal(conn.refreshToken, conn.siteId);
    const { accessToken, refreshToken: newRefresh } = await api.refresh(refreshToken);

    // If Google issued a new refresh token, persist it.
    if (newRefresh) {
      const { seal } = await import("./security");
      await db.dataSourceConnection.update({
        where: { id: connectionId },
        data: { refreshToken: seal(newRefresh, conn.siteId) },
      });
    }

    // 2. Determine date ranges.
    const current = datePeriod(1, RANGE_DAYS, conn.timeZone);
    const previous = datePeriod(1 + RANGE_DAYS, RANGE_DAYS, conn.timeZone);

    // 3. Run reports in parallel.
    const [overviewCurrent, overviewPrevious, pages, landingPages, acquisition, devices, events, revenue] =
      await Promise.all([
        api.report(conn.propertyId, accessToken, overviewReportBody(current)),
        api.report(conn.propertyId, accessToken, overviewReportBody(previous)).catch(() => null),
        api.report(conn.propertyId, accessToken, pagesReportBody(current)),
        api.report(conn.propertyId, accessToken, landingPagesReportBody(current)),
        api.report(conn.propertyId, accessToken, acquisitionReportBody(current)),
        api.report(conn.propertyId, accessToken, devicesReportBody(current)),
        api.report(conn.propertyId, accessToken, eventsReportBody(current)),
        api.report(conn.propertyId, accessToken, revenueReportBody(current)).catch(() => null),
      ]);

    // 4. Check for key events.
    let keyEventConfig: "present" | "absent" | "unknown" = "unknown";
    try {
      const keyEvents = await api.keyEvents(conn.propertyId, accessToken);
      keyEventConfig = keyEvents.length > 0 ? "present" : "absent";
    } catch {
      keyEventConfig = "unknown";
    }

    // 5. Build the snapshot.
    const currentMetrics = parseOverview(overviewCurrent);
    const previousMetrics = overviewPrevious ? parseOverview(overviewPrevious) : null;
    const parsedRevenue = revenue ? parseRevenue(revenue) : { purchases: null, purchaseRevenue: null, currency: null };
    const parsedPages = parsePages(pages);
    const parsedLandingPages = parseLandingPages(landingPages);

    const notes: string[] = [];
    if (currentMetrics.activeUsers === null || currentMetrics.activeUsers === 0) {
      notes.push("No active users were recorded during this period. The property may have limited or no traffic.");
    }
    if (keyEventConfig === "absent") {
      notes.push("No key events (conversions) are configured in this GA4 property. Conversion metrics are unavailable.");
    }
    if (parsedRevenue.purchases === null || parsedRevenue.purchases === 0) {
      notes.push("Revenue data is unavailable. This property may not have e-commerce tracking configured.");
    }
    if (parsedPages.length === 0) {
      notes.push("No page-level data was returned. The property may have limited traffic or data retention.");
    }

    const reliable = (currentMetrics.activeUsers ?? 0) >= 10 && parsedPages.length > 0;

    const snapshot: AnalyticsSnapshot = {
      version: 1,
      source: "ga4",
      propertyId: conn.propertyId,
      propertyName: conn.propertyName,
      streamId: conn.streamId,
      hostname: conn.hostname,
      timeZone: conn.timeZone,
      syncedAt: new Date().toISOString(),
      period: current,
      previousPeriod: previous,
      current: currentMetrics,
      previous: previousMetrics,
      pages: parsedPages,
      landingPages: parsedLandingPages,
      acquisition: parseAcquisition(acquisition),
      devices: parseDevices(devices),
      events: parseEvents(events),
      revenue: parsedRevenue,
      keyEventConfiguration: keyEventConfig,
      reliable,
      notes,
    };

    // Validate against the schema before persisting.
    const validated = snapshotSchema.parse(snapshot);

    // 6. Persist.
    await db.dataSourceConnection.update({
      where: { id: connectionId },
      data: {
        snapshot: validated as unknown as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        lastAttemptAt: new Date(),
        nextSyncAt: new Date(Date.now() + 6 * 3600_000), // next sync in 6 hours
        status: "connected",
        lastError: null,
        leaseToken: null,
        leaseUntil: null,
      },
    });

    return validated;
  } catch (error) {
    const analyticsError = safeError(error);

    // Persist the error but do not wipe the cached snapshot — stale data is
    // better than no data.
    await db.dataSourceConnection.update({
      where: { id: connectionId },
      data: {
        lastAttemptAt: new Date(),
        nextSyncAt: new Date(Date.now() + 3600_000), // retry in 1 hour on error
        status: analyticsError.code === "reconnect" ? "error" : "connected",
        lastError: analyticsError.message,
        leaseToken: null,
        leaseUntil: null,
      },
    });

    throw analyticsError;
  }
}

/**
 * Find connections that are due for a background sync.
 */
export async function findConnectionsDueForSync(limit: number) {
  return db.dataSourceConnection.findMany({
    where: {
      status: { in: ["connected"] },
      nextSyncAt: { lte: new Date() },
      OR: [
        { leaseToken: null },
        { leaseUntil: { lt: new Date() } },
      ],
    },
    orderBy: { nextSyncAt: "asc" },
    take: limit,
    select: { id: true, siteId: true, propertyName: true },
  });
}

/**
 * Get the cached analytics snapshot for a site (if any).
 */
export async function getSnapshotForSite(siteId: string): Promise<AnalyticsSnapshot | null> {
  const conn = await db.dataSourceConnection.findFirst({
    where: { siteId, provider: "ga4", status: { not: "disconnected" } },
    select: { snapshot: true },
  });
  if (!conn?.snapshot) return null;
  try {
    return snapshotSchema.parse(conn.snapshot);
  } catch {
    return null;
  }
}
