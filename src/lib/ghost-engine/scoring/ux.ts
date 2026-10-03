import type { ContextPack } from "../types";
import type { DimensionScore, ScoreCheck } from "./types";
import { applyChecklist, homepage, normalize, pageText } from "./utils";

function navScoreChecks(pack: ContextPack): ScoreCheck[] {
  const checks: ScoreCheck[] = [];
  const n = pack.nav_structure?.length ?? 0;

  checks.push({
    id: "nav_present",
    label: "Main navigation exists (not empty).",
    passed: n > 0,
    points: n > 0 ? 4 : -6,
    evidence: n > 0 ? `Nav: ${pack.nav_structure.join(", ")}` : "Nav: (empty)",
  });

  checks.push({
    id: "nav_size",
    label: "Navigation length is reasonable (3–8 items).",
    passed: n >= 3 && n <= 8,
    points: n >= 3 && n <= 8 ? 6 : n > 0 ? -4 : 0,
    evidence: n > 0 ? `Nav items: ${n}` : "Nav items: 0",
  });

  return checks;
}

function visualChecks(pack: ContextPack): ScoreCheck[] {
  const checks: ScoreCheck[] = [];
  const home = homepage(pack);
  const vn = normalize(home?.visual_notes ?? "");

  const positive = /(clear|easy to find|prominent|above the fold|visible|simple)/i.test(vn);
  checks.push({
    id: "above_fold_clarity",
    label: "Above-the-fold content seems clear (based on visual notes).",
    passed: positive,
    points: positive ? 6 : 0,
    evidence: home?.visual_notes ? home.visual_notes.slice(0, 220) : "No screenshot/visual notes for homepage.",
  });

  const negative = /(buried|hard to find|confusing|clutter|too many|carousel|banner after banner|scroll)/i.test(vn);
  checks.push({
    id: "clutter_or_buried",
    label: "Content is not buried under clutter/banners (based on visual notes).",
    passed: !negative,
    points: negative ? -8 : 5,
    evidence: home?.visual_notes ? home.visual_notes.slice(0, 220) : "No screenshot/visual notes for homepage.",
  });

  return checks;
}

export function scoreUx(pack: ContextPack): DimensionScore {
  const checks: ScoreCheck[] = [];
  checks.push(...navScoreChecks(pack));
  checks.push(...visualChecks(pack));

  const text = pageText(pack);
  const mobileHints = /mobile|responsive|tap|sticky|call now/i.test(normalize(text));
  checks.push({
    id: "mobile_hints",
    label: "Mobile friendliness signals appear (responsive/mobile cues).",
    passed: mobileHints,
    points: mobileHints ? 4 : 0,
    evidence: mobileHints ? "Context Pack mentions mobile/responsive-like cues." : "No explicit mobile cues detected in Context Pack text.",
  });

  const { value } = applyChecklist(55, checks);
  return {
    id: "ux",
    label: "UX & Navigation",
    weight: 0.15,
    value,
    contribution: Math.round(value * 0.15),
    checks,
  };
}

