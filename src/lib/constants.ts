import type { MissionStageInfo } from "./types";
import { copy, getMissionStages } from "./copy";

export const COLORS = {
  midnight: "#101716",
  navy: "#18221F",
  ghostWhite: "#F2F5F0",
  violet: "#78DEC5",
  aiBlue: "#9CBDF0",
  neonGreen: "#8ED4A5",
} as const;

export const MISSION_STAGES: MissionStageInfo[] = getMissionStages();

export const SEVERITY_CONFIG = {
  // Ghost White + Ember: text colours are the AA-safe variants on white.
  critical: {
    label: copy.severity.critical,
    color: "#C2340E",
    bg: "#FFE9E1",
    border: "rgba(255, 74, 28, 0.35)",
  },
  high: {
    label: copy.severity.high,
    color: "#C2340E",
    bg: "#FFE9E1",
    border: "rgba(255, 74, 28, 0.25)",
  },
  medium: {
    label: copy.severity.medium,
    color: "#A14A08",
    bg: "#FEF3E2",
    border: "rgba(245, 158, 11, 0.3)",
  },
  low: {
    label: copy.severity.low,
    color: "#65686F",
    bg: "#F6F6F3",
    border: "#E6E6E1",
  },
} as const;
