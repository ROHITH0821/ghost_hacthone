import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { buildMarketComparisonViewModel } from "@/lib/competitor-intelligence/comparison-view-model";
import { PALETTE, SEVERITY_COLOR, withAlpha } from "../theme";
import { esc, pad2, pageHead, sheet } from "../primitives";
import { orderedLeaks } from "./leaks";
import type { ReportContext } from "../context";

type RoadmapItem = {
  title: string;
  source: string;
  weight: "critical" | "high" | "medium" | "low";
};

const HORIZONS = [
  {
    key: "week",
    title: "This week",
    blurb: "Nothing else moves the number until these are done.",
    weights: ["critical"] as const,
  },
  {
    key: "month",
    title: "This month",
    blurb: "Meaningful lift, but they can wait behind the critical work.",
    weights: ["high"] as const,
  },
  {
    key: "quarter",
    title: "This quarter",
    blurb: "Worth doing once the bleeding has stopped.",
    weights: ["medium", "low"] as const,
  },
];

const WEIGHT_COLOR = {
  critical: SEVERITY_COLOR.critical,
  high: SEVERITY_COLOR.high,
  medium: SEVERITY_COLOR.medium,
  low: SEVERITY_COLOR.low,
};

/**
 * The action plan.
 *
 * This is a *regrouping* of recommendations already made elsewhere in the report
 * — findings by severity and market actions by priority, sorted into
 * horizons. It introduces no new advice.
 */
export function roadmapSheet(
  ctx: ReportContext,
  intelligence?: CompetitorIntelligence | null,
): string {
  const { report, accent, footLeft } = ctx;

  const items: RoadmapItem[] = orderedLeaks(report.leaks).map((leak, i) => ({
    title: leak.howToFix,
    source: `Finding ${pad2(i + 1)} — ${leak.title}`,
    weight: leak.severity,
  }));

  if (intelligence) {
    const view = buildMarketComparisonViewModel(intelligence);
    for (const action of view.actions) {
      items.push({
        title: action.recommendation,
        source: `Market — ${action.title}`,
        weight: action.priority,
      });
    }
  }

  if (items.length === 0) return "";

  const groups = HORIZONS.map((h) => ({
    ...h,
    items: items.filter((item) =>
      (h.weights as readonly string[]).includes(item.weight),
    ),
  })).filter((g) => g.items.length > 0);

  const blocks = groups
    .map(
      (g, gi) => `<div class="avoid-break" style="margin-bottom:16pt;">
        <div style="display:flex;align-items:baseline;gap:10pt;padding-bottom:5pt;border-bottom:1pt solid ${PALETTE.ink};margin-bottom:9pt;">
          <span style="font-family:'Space Grotesk',sans-serif;font-size:8pt;font-weight:700;color:${accent};letter-spacing:0.1em;">0${gi + 1}</span>
          <h3 class="h3" style="margin:0;flex:1 1 auto;">${esc(g.title)}</h3>
          <span style="font-size:7.6pt;" class="faint">${g.items.length} item${g.items.length === 1 ? "" : "s"}</span>
        </div>

        <p class="body-sm" style="margin:0 0 8pt;">${esc(g.blurb)}</p>

        ${g.items
          .map(
            (item) => `<div class="avoid-break" style="display:flex;gap:9pt;padding:6pt 0;border-bottom:0.75pt solid ${PALETTE.ruleSoft};">
              <span style="flex:none;width:6pt;height:6pt;border-radius:6pt;margin-top:4pt;background:${WEIGHT_COLOR[item.weight]};display:inline-block;"></span>
              <div style="flex:1 1 auto;min-width:0;">
                <div style="font-size:9.2pt;line-height:1.45;">${esc(item.title)}</div>
                <div style="margin-top:2pt;font-size:7.4pt;" class="faint">${esc(item.source)}</div>
              </div>
            </div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  return sheet(
    `${pageHead("Action plan", "13")}

    <div class="lede">
      Everything this report recommends, in the order it should be done. Each line
      traces back to the finding it came from.
    </div>

    <div style="background:${withAlpha(accent, 0.06)};border-radius:4pt;padding:9pt 12pt;margin-bottom:16pt;">
      <p class="body-sm" style="margin:0;">
        <b>${items.length}</b> recommendation${items.length === 1 ? "" : "s"} across
        <b>${groups.length}</b> horizon${groups.length === 1 ? "" : "s"}. No new advice appears here —
        this is the same guidance from earlier pages, sequenced.
      </p>
    </div>

    ${blocks}`,
    { footLeft, footRight: "Action plan" },
  );
}
