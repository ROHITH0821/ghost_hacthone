import type {
  GhostReport,
  MissionState,
  ShopperPersona,
} from "./types";
import { copy } from "./copy";

export function createPersonas(): ShopperPersona[] {
  return copy.personas.defaults.map((p) => ({
    ...p,
    color:
      p.id === "budget-buyer"
        ? "#38BDF8"
        : p.id === "first-time"
          ? "#A78BFA"
          : p.id === "premium"
            ? "#7C3AED"
            : p.id === "busy"
              ? "#22C55E"
              : "#F59E0B",
    progress: 0,
  }));
}

export function createMockReport(url: string, domain: string): GhostReport {
  return {
    id: `report-${Date.now()}`,
    url,
    domain,
    score: 62,
    scoreVersion: "2",
    scoreBreakdown: {
      version: "2",
      value: 62,
      band: "NeedsImprovement",
      dimensions: [
        {
          id: "customer_journey",
          label: "Customer Journey",
          weight: 0.3,
          value: 66,
          contribution: 20,
          checks: [],
        },
        {
          id: "trust",
          label: "Trust & Credibility",
          weight: 0.2,
          value: 63,
          contribution: 13,
          checks: [],
        },
        {
          id: "conversion",
          label: "Conversion Optimization",
          weight: 0.2,
          value: 71,
          contribution: 14,
          checks: [],
        },
        {
          id: "ux",
          label: "UX & Navigation",
          weight: 0.15,
          value: 67,
          contribution: 10,
          checks: [],
        },
        {
          id: "information",
          label: "Information Quality",
          weight: 0.1,
          value: 71,
          contribution: 7,
          checks: [],
        },
        {
          id: "technical",
          label: "Technical Experience",
          weight: 0.05,
          value: 67,
          contribution: 3,
          checks: [],
        },
      ],
    },
    scannedAt: new Date().toISOString(),
    businessUnderstanding: {
      ...copy.mock.businessUnderstanding,
      customerExpectations: [
        ...copy.mock.businessUnderstanding.customerExpectations,
      ],
    },
    journey: copy.mock.journey.map((step) => ({ ...step })),
    leaks: copy.mock.leaks.map((leak) => ({ ...leak })),
    fixes: copy.mock.fixes.map((fix) => ({ ...fix })),
  };
}

export function createInitialMission(
  id: string,
  url: string,
  domain: string
): MissionState {
  return {
    id,
    url,
    domain,
    status: "running",
    currentStage: "opening",
    stageProgress: 0,
    personas: createPersonas(),
    startedAt: new Date().toISOString(),
  };
}
