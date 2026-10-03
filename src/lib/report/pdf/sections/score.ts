import type { Severity } from "@/lib/types";
import { PALETTE, SEVERITY_COLOR, scoreColor, scoreLabel } from "../theme";
import {
  barRow,
  chunk,
  donut,
  esc,
  evidenceRow,
  label,
  pad2,
  pageHead,
  sheet,
} from "../primitives";
import type { ReportContext } from "../context";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

/** Page 2 — the bottom line, before any detail. */
export function verdictSheet(ctx: ReportContext): string {
  const { report, accent, footLeft } = ctx;
  const color = scoreColor(report.score);
  const bu = report.businessUnderstanding;

  const bySeverity = SEVERITY_ORDER.map((s) => ({
    severity: s,
    count: report.leaks.filter((l) => l.severity === s).length,
  })).filter((row) => row.count > 0);

  const dims = report.scoreBreakdown?.dimensions ?? [];
  const weakest = [...dims].sort((a, b) => a.value - b.value)[0];

  const stats = [
    { v: String(report.score), k: "Ghost Score", c: color },
    { v: String(report.leaks.length), k: "Findings", c: PALETTE.ink },
    {
      v: String(report.leaks.filter((l) => l.severity === "critical").length),
      k: "Critical",
      c: SEVERITY_COLOR.critical,
    },
    { v: String(report.fixes.length), k: "Ready-to-paste fixes", c: PALETTE.ink },
  ];

  const severityLine = bySeverity.length
    ? `<div style="margin-top:12pt;display:flex;gap:14pt;flex-wrap:wrap;">
        ${bySeverity
          .map(
            (row) => `<span style="display:flex;align-items:center;gap:5pt;font-size:8.6pt;">
              <span style="width:7pt;height:7pt;border-radius:7pt;background:${SEVERITY_COLOR[row.severity]};display:inline-block;"></span>
              <span style="font-weight:600;">${row.count}</span>
              <span class="muted">${esc(row.severity)}</span>
            </span>`,
          )
          .join("")}
      </div>`
    : "";

  const confidenceNote =
    report.lowConfidence && report.confidenceNote
      ? `<div class="note" style="margin-top:16pt;"><b>Limited visibility — results may be incomplete.</b> ${esc(report.confidenceNote)}</div>`
      : "";

  return sheet(
    `${pageHead("Executive verdict", "01")}

    <div class="lede">
      Ghost walked ${esc(report.domain)} as a customer and scored the experience
      <b style="color:${color};">${esc(scoreLabel(report.score).toLowerCase())}</b>
      at ${report.score} out of 100${
        weakest
          ? `, held back most by <b>${esc(weakest.label.toLowerCase())}</b>`
          : ""
      }.
      ${
        report.leaks.length
          ? `${report.leaks.length} finding${report.leaks.length === 1 ? "" : "s"} — potential obstacles in simulated journeys — ${report.leaks.length === 1 ? "is" : "are"} documented in this report, each with the evidence behind it and a fix.`
          : "No findings were detected on this pass."
      }
    </div>

    <div class="stat-row">
      ${stats
        .map(
          (s) => `<div class="stat">
            <div class="v" style="color:${s.c};">${esc(s.v)}</div>
            <div class="k">${esc(s.k)}</div>
          </div>`,
        )
        .join("")}
    </div>

    ${severityLine}

    <div class="rule"></div>

    <div class="grid-2">
      <div>
        ${label("What this business is trying to do")}
        <p class="body-sm">${esc(bu.primaryGoal)}</p>
      </div>
      <div>
        ${label("Who it is trying to reach")}
        <p class="body-sm">${esc(bu.targetAudience)}</p>
      </div>
    </div>

    ${confidenceNote}

    ${
      report.leaks.length > 0
        ? `<div style="margin-top:18pt;border-left:2.5pt solid ${accent};padding-left:12pt;">
             ${label("Read this first")}
             <p class="body-sm" style="margin:0;">
               ${
                 report.leaks.length > 2
                   ? "Review the highest-priority findings first. Verify the evidence and measure actual customer outcomes after changes."
                   : "Each finding carries supporting evidence and a suggested fix to review."
               }
             </p>
           </div>`
        : ""
    }`,
    { footLeft, footRight: "Executive verdict" },
  );
}

/** Page 3 — how the score is built. */
export function scoreSheet(ctx: ReportContext): string {
  const { report, footLeft } = ctx;
  const breakdown = report.scoreBreakdown;
  if (!breakdown) return "";

  const color = scoreColor(report.score);
  const dims = breakdown.dimensions;

  const rows = dims
    .map((d) =>
      barRow(
        d.label,
        d.value,
        scoreColor(d.value),
        `Weight ${Math.round(d.weight * 100)}% · contributes ${d.contribution.toFixed(1)} points`,
      ),
    )
    .join("");

  return sheet(
    `${pageHead("Ghost Score", "02")}

    <div class="lede">
      The score is a weighted roll-up of six dimensions. Each one is made of individual
      checks with their own evidence — every check is listed in the pages that follow, so
      nothing here is a black box.
    </div>

    <div style="display:flex;gap:26pt;align-items:flex-start;">
      <div style="flex:none;text-align:center;">
        ${donut(report.score, color, 150)}
        <div style="margin-top:8pt;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:11pt;color:${color};">
          ${esc(scoreLabel(report.score))}
        </div>
      </div>
      <div style="flex:1 1 auto;min-width:0;padding-top:4pt;">
        ${rows}
      </div>
    </div>

    <div class="rule"></div>

    <table>
      <thead>
        <tr><th>Dimension</th><th style="text-align:right;">Weight</th><th style="text-align:right;">Score</th><th style="text-align:right;">Contribution</th></tr>
      </thead>
      <tbody>
        ${dims
          .map(
            (d) => `<tr>
              <td>${esc(d.label)}</td>
              <td class="num">${Math.round(d.weight * 100)}%</td>
              <td class="num">${d.value}</td>
              <td class="num">${d.contribution.toFixed(1)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`,
    { footLeft, footRight: "Ghost Score" },
  );
}

/**
 * Score evidence — the per-check pass/fail detail the engine computes and the
 * previous PDF discarded. Two dimensions per sheet keeps each page readable.
 */
export function scoreEvidenceSheets(ctx: ReportContext): string {
  const { report, footLeft } = ctx;
  const dims = report.scoreBreakdown?.dimensions ?? [];
  const withChecks = dims.filter((d) => d.checks.length > 0);
  if (withChecks.length === 0) return "";

  return chunk(withChecks, 2)
    .map((pair, pageIndex) => {
      const blocks = pair
        .map((d) => {
          const passed = d.checks.filter((c) => c.passed).length;
          return `<div style="margin-bottom:16pt;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6pt;">
              <h3 class="h3" style="margin:0;">${esc(d.label)}</h3>
              <span style="font-size:8.4pt;font-weight:600;font-variant-numeric:tabular-nums;color:${scoreColor(d.value)};">
                ${d.value} / 100
              </span>
            </div>
            <div style="margin-bottom:8pt;font-size:7.6pt;" class="faint">
              ${passed} of ${d.checks.length} checks passed · weight ${Math.round(d.weight * 100)}%
            </div>
            ${d.checks
              .map((c) => evidenceRow(c.passed, c.label, c.points, c.evidence))
              .join("")}
          </div>`;
        })
        .join("");

      return sheet(
        `${pageHead("Score evidence", `03.${pad2(pageIndex + 1)}`)}
        ${
          pageIndex === 0
            ? `<div class="lede">Every check behind the score, with what Ghost actually observed on the site.</div>`
            : ""
        }
        ${blocks}`,
        { footLeft, footRight: "Score evidence" },
      );
    })
    .join("");
}
