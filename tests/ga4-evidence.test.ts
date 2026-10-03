import test from "node:test";
import assert from "node:assert/strict";
import { buildExternalEvidence } from "@/lib/data-sources/ga4/evidence";
import type { AnalyticsSnapshot } from "@/lib/data-sources/types";
import type { GhostReport } from "@/lib/types";

const mockSnapshot: AnalyticsSnapshot = {
  version: 1,
  source: "ga4",
  propertyId: "12345",
  propertyName: "Test Site",
  streamId: "67890",
  hostname: "testsite.com",
  timeZone: "UTC",
  syncedAt: new Date().toISOString(),
  period: { start: "2026-08-21", end: "2026-09-20" },
  previousPeriod: { start: "2026-07-22", end: "2026-08-20" },
  current: {
    activeUsers: 2000,
    totalUsers: 2500,
    newUsers: 1800,
    sessions: 3000,
    views: 8000,
    engagementRate: 0.6,
    engagementSeconds: 60,
    keyEvents: 90,
    sessionKeyEventRate: 0.03,
  },
  previous: {
    activeUsers: 1600,
    totalUsers: 2000,
    newUsers: 1400,
    sessions: 2400,
    views: 6500,
    engagementRate: 0.58,
    engagementSeconds: 55,
    keyEvents: 70,
    sessionKeyEventRate: 0.029,
  },
  pages: [
    { path: "/", views: 4000 },
    { path: "/pricing", views: 1200 },
    { path: "/checkout", views: 350 },
    { path: "/blog/hidden-post", views: 25 },
  ],
  landingPages: [
    { path: "/", sessions: 2000, engagementRate: 0.65, sessionKeyEventRate: 0.035 },
    { path: "/pricing", sessions: 600, engagementRate: 0.45, sessionKeyEventRate: 0.008 },
    { path: "/checkout", sessions: 80, engagementRate: 0.35, sessionKeyEventRate: 0.05 },
  ],
  acquisition: [],
  devices: [],
  events: [],
  revenue: { purchases: 90, purchaseRevenue: 4500, currency: "USD" },
  keyEventConfiguration: "present",
  reliable: true,
  notes: [],
};

const mockReport: GhostReport = {
  id: "mission-test-1",
  domain: "testsite.com",
  scannedAt: new Date().toISOString(),
  url: "https://testsite.com",
  score: 68,
  businessUnderstanding: {
    businessType: "e-commerce",
    targetAudience: "shoppers",
    primaryGoal: "sales",
    customerExpectations: [],
  },
  journey: [],
  fixes: [],
  leaks: [
    {
      id: "leak-pricing",
      title: "Confusing pricing tiers and hidden checkout fees",
      severity: "critical",
      category: "Pricing",
      whatIsWrong: "The pricing page lacks clear tier comparisons.",
      whyCustomersLeave: "Visitors feel uncertain about costs and abandon.",
      impact: "High drop-off right before checkout.",
      howToFix: "Streamline pricing table with clear monthly vs annual toggle.",
    },
    {
      id: "leak-hero",
      title: "Vague hero headline on the homepage",
      severity: "high",
      category: "First Impression",
      whatIsWrong: "The headline does not state the value proposition clearly.",
      whyCustomersLeave: "First-time visitors bounce within 5 seconds.",
      impact: "Loss of top-of-funnel traffic.",
      howToFix: "Clarify the hero statement above the fold.",
    },
    {
      id: "leak-unmatched",
      title: "Broken link in footer to terms of service",
      severity: "low",
      category: "Legal",
      whatIsWrong: "Footer terms link 404s.",
      whyCustomersLeave: "Minor trust erosion for legal scrollers.",
      impact: "Minimal.",
      howToFix: "Fix URL path in footer component.",
    },
  ],
};

test("GA4 Evidence Layer - builds findings evidence and priority IDs", () => {
  const evidence = buildExternalEvidence(mockSnapshot, mockReport);
  assert.ok(evidence !== null);

  // Active user percent change: (2000 - 1600) / 1600 = +25%
  assert.equal(evidence.activeUserChangePercent, 25);

  // Should have evidence for leak-pricing and leak-hero
  const pricingEv = evidence.findings.find((f) => f.findingId === "leak-pricing");
  assert.ok(pricingEv);
  assert.equal(pricingEv.path, "/pricing");
  assert.equal(pricingEv.views, 1200);
  assert.equal(pricingEv.landingSessions, 600);
  assert.ok(pricingEv.observation.includes("1,200 page views"));
  assert.ok(pricingEv.recommendation);

  const heroEv = evidence.findings.find((f) => f.findingId === "leak-hero");
  assert.ok(heroEv);
  assert.equal(heroEv.path, "/");
  assert.equal(heroEv.views, 4000);

  // Priority findings: pages with > 100 views or > 50 landing sessions
  assert.ok(evidence.priorityFindingIds.includes("leak-pricing"));
  assert.ok(evidence.priorityFindingIds.includes("leak-hero"));
  assert.ok(!evidence.priorityFindingIds.includes("leak-unmatched"));
});
