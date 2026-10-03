import test from "node:test";
import assert from "node:assert/strict";
import { snapshotSchema, type AnalyticsSnapshot } from "@/lib/data-sources/types";
import { formatPeriod } from "@/lib/data-sources/ga4/evidence";

test("GA4 Sync - snapshotSchema parses a valid complete snapshot", () => {
  const mockSnapshot: AnalyticsSnapshot = {
    version: 1,
    source: "ga4",
    propertyId: "123456789",
    propertyName: "Example Store",
    streamId: "987654321",
    hostname: "examplestore.com",
    timeZone: "America/New_York",
    syncedAt: new Date().toISOString(),
    period: { start: "2026-08-21", end: "2026-09-20" },
    previousPeriod: { start: "2026-07-22", end: "2026-08-20" },
    current: {
      activeUsers: 1420,
      totalUsers: 1650,
      newUsers: 1200,
      sessions: 2100,
      views: 5800,
      engagementRate: 0.65,
      engagementSeconds: 78,
      keyEvents: 42,
      sessionKeyEventRate: 0.02,
    },
    previous: {
      activeUsers: 1300,
      totalUsers: 1500,
      newUsers: 1100,
      sessions: 1900,
      views: 5100,
      engagementRate: 0.61,
      engagementSeconds: 72,
      keyEvents: 35,
      sessionKeyEventRate: 0.018,
    },
    pages: [
      { path: "/", views: 2400 },
      { path: "/pricing", views: 950 },
      { path: "/checkout", views: 220 },
    ],
    landingPages: [
      { path: "/", sessions: 1500, engagementRate: 0.68, sessionKeyEventRate: 0.025 },
      { path: "/pricing", sessions: 450, engagementRate: 0.52, sessionKeyEventRate: 0.01 },
    ],
    acquisition: [
      { source: "google", medium: "organic", sessions: 1100 },
      { source: "(direct)", medium: "(none)", sessions: 600 },
    ],
    devices: [
      { category: "mobile", sessions: 1300 },
      { category: "desktop", sessions: 750 },
      { category: "tablet", sessions: 50 },
    ],
    events: [
      { name: "page_view", count: 5800, keyEvents: null },
      { name: "purchase", count: 42, keyEvents: 42 },
    ],
    revenue: {
      purchases: 42,
      purchaseRevenue: 3450.5,
      currency: "USD",
    },
    keyEventConfiguration: "present",
    reliable: true,
    notes: [],
  };

  const parsed = snapshotSchema.parse(mockSnapshot);
  assert.equal(parsed.source, "ga4");
  assert.equal(parsed.current.sessions, 2100);
  assert.equal(parsed.pages.length, 3);
});

test("GA4 Sync - snapshotSchema handles missing conversions gracefully", () => {
  const minimalSnapshot: AnalyticsSnapshot = {
    version: 1,
    source: "ga4",
    propertyId: "999888777",
    propertyName: "Blog Site",
    streamId: "111222333",
    hostname: "myblog.org",
    timeZone: "UTC",
    syncedAt: new Date().toISOString(),
    period: { start: "2026-08-21", end: "2026-09-20" },
    previousPeriod: { start: "2026-07-22", end: "2026-08-20" },
    current: {
      activeUsers: 300,
      totalUsers: 350,
      newUsers: 250,
      sessions: 400,
      views: 900,
      engagementRate: 0.5,
      engagementSeconds: 45,
      keyEvents: null,
      sessionKeyEventRate: null,
    },
    previous: null,
    pages: [],
    landingPages: [],
    acquisition: [],
    devices: [],
    events: [],
    revenue: {
      purchases: null,
      purchaseRevenue: null,
      currency: null,
    },
    keyEventConfiguration: "absent",
    reliable: false,
    notes: ["No conversion events configured in GA4"],
  };

  const parsed = snapshotSchema.parse(minimalSnapshot);
  assert.equal(parsed.keyEventConfiguration, "absent");
  assert.equal(parsed.reliable, false);
  assert.equal(parsed.current.keyEvents, null);
});

test("GA4 Sync - formatPeriod outputs readable date ranges", () => {
  const formatted = formatPeriod({ start: "2026-08-01", end: "2026-08-31" });
  assert.ok(formatted.includes("Aug"));
  assert.ok(formatted.includes("2026"));
});
