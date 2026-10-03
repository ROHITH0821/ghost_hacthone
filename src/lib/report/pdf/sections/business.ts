import { PALETTE, SEVERITY_COLOR, withAlpha } from "../theme";
import { esc, label, pageHead, sheet } from "../primitives";
import type { ReportContext } from "../context";

/** What Ghost worked out about the business before judging it. */
export function detectedSheet(ctx: ReportContext): string {
  const { report, accent, footLeft } = ctx;
  const bu = report.businessUnderstanding;

  const expectations = bu.customerExpectations
    .map((e) => `<span class="chip">${esc(e)}</span>`)
    .join("");

  return sheet(
    `${pageHead("What Ghost detected", "04")}

    <div class="lede">
      Before scoring anything, Ghost reads the site to work out what the business sells,
      who it is for, and what a customer arriving here would expect to find. Everything
      later in this report is judged against that.
    </div>

    <div class="grid-2">
      <div class="card">
        ${label("Business type")}
        <p class="body-sm" style="margin:0;">${esc(bu.businessType)}</p>
      </div>
      <div class="card">
        ${label("Target audience")}
        <p class="body-sm" style="margin:0;">${esc(bu.targetAudience)}</p>
      </div>
    </div>

    <div class="card" style="margin-top:10pt;border-left:2.5pt solid ${accent};">
      ${label("Primary goal of the site")}
      <p style="margin:0;font-size:11pt;line-height:1.45;">${esc(bu.primaryGoal)}</p>
    </div>

    <div class="rule"></div>

    ${label("What customers expect to find")}
    <p class="body-sm" style="max-width:145mm;">
      These are the things a visitor in this market assumes will be on the site. Each one
      Ghost could not find becomes a reason to leave.
    </p>
    <div style="margin-top:8pt;">${expectations}</div>`,
    { footLeft, footRight: "What Ghost detected" },
  );
}

/**
 * The customer journey funnel — stages, drop-off, and the leak reason at each
 * stage. Present on every report but never rendered by the previous generator.
 */
export function funnelSheet(ctx: ReportContext): string {
  const { report, footLeft } = ctx;
  const steps = report.journey;
  if (!steps || steps.length === 0) return "";

  const rows = steps
    .map((step, i) => {
      const leaking = step.hasLeak === true;
      const markerColor = leaking ? SEVERITY_COLOR.critical : PALETTE.faint;

      return `<div class="avoid-break" style="display:flex;gap:12pt;padding-bottom:14pt;">
        <div style="flex:none;width:16pt;display:flex;flex-direction:column;align-items:center;">
          <span style="width:16pt;height:16pt;border-radius:16pt;background:${withAlpha(markerColor, 0.14)};color:${markerColor};font-family:'Space Grotesk',sans-serif;font-size:7.5pt;font-weight:700;line-height:16pt;text-align:center;">${i + 1}</span>
          ${
            i < steps.length - 1
              ? `<span style="flex:1 1 auto;width:1pt;background:${PALETTE.rule};margin-top:4pt;min-height:22pt;"></span>`
              : ""
          }
        </div>

        <div style="flex:1 1 auto;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10pt;">
            <span style="font-size:10.5pt;font-weight:600;">${esc(step.label)}</span>
            ${
              leaking
                ? `<span style="font-size:9pt;font-weight:600;font-variant-numeric:tabular-nums;color:${markerColor};white-space:nowrap;">Potential friction</span>`
                : ""
            }
          </div>

          <p class="body-sm" style="margin:2pt 0 5pt;">${esc(step.description)}</p>



          ${
            leaking && step.leakReason
              ? `<div style="margin-top:6pt;background:${withAlpha(SEVERITY_COLOR.critical, 0.06)};border-left:2pt solid ${SEVERITY_COLOR.critical};border-radius:0 3pt 3pt 0;padding:6pt 9pt;">
                   <span style="font-size:6.8pt;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${SEVERITY_COLOR.critical};">Finding</span>
                   <p style="margin:2pt 0 0;font-size:8.8pt;line-height:1.45;">${esc(step.leakReason)}</p>
                 </div>`
              : ""
          }
        </div>
      </div>`;
    })
    .join("");

  const leakCount = steps.filter((s) => s.hasLeak).length;

  return sheet(
    `${pageHead("The customer journey", "05")}

    <div class="lede">
      Simulated customer journeys and potential friction${
        leakCount
          ? ` — ${leakCount} stage${leakCount === 1 ? "" : "s"} ${leakCount === 1 ? "is" : "are"} showing potential friction`
          : ""
      }.
    </div>

    ${rows}`,
    { footLeft, footRight: "Customer journey" },
  );
}
