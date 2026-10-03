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
  critical: {
    label: copy.severity.critical,
    color: "#F69F98",
    bg: "rgba(246, 159, 152, 0.1)",
    border: "rgba(246, 159, 152, 0.3)",
  },
  high: {
    label: copy.severity.high,
    color: "#F2C879",
    bg: "rgba(242, 200, 121, 0.1)",
    border: "rgba(242, 200, 121, 0.3)",
  },
  medium: {
    label: copy.severity.medium,
    color: "#9CBDF0",
    bg: "rgba(156, 189, 240, 0.1)",
    border: "rgba(156, 189, 240, 0.3)",
  },
  low: {
    label: copy.severity.low,
    color: "#A0B1AB",
    bg: "rgba(160, 177, 171, 0.1)",
    border: "rgba(160, 177, 171, 0.3)",
  },
} as const;
