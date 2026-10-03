import type { GhostScoreBand } from "./types";

export function scoreBand(value: number): GhostScoreBand {
  if (value >= 95) return "Excellent";
  if (value >= 85) return "Strong";
  if (value >= 70) return "Good";
  if (value >= 55) return "NeedsImprovement";
  if (value >= 40) return "Weak";
  return "Critical";
}

