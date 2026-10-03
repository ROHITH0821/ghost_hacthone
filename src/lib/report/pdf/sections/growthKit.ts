import { PALETTE } from "../theme";
import { chunk, esc, label, pad2, pageHead, sheet } from "../primitives";
import type { ReportContext } from "../context";

/**
 * Suggested fixes — the ready-to-paste assets. Two per sheet: enough room for the
 * paste block to breathe without stranding half a page.
 */
export function growthKitSheets(ctx: ReportContext): string {
  const { report, accent, footLeft } = ctx;
  if (report.fixes.length === 0) return "";

  return chunk(report.fixes, 2)
    .map((group, pageIndex) => {
      const cards = group
        .map((fix, i) => {
          const n = pageIndex * 2 + i + 1;
          return `<div class="avoid-break" style="margin-bottom:16pt;">
            <div style="display:flex;align-items:baseline;gap:9pt;margin-bottom:3pt;">
              <span style="font-family:'Space Grotesk',sans-serif;font-size:9pt;font-weight:700;color:${accent};">${pad2(n)}</span>
              <span style="font-size:16pt;line-height:1;">${esc(fix.icon)}</span>
              <h3 class="h3" style="margin:0;flex:1 1 auto;">${esc(fix.title)}</h3>
              <span style="font-size:7.2pt;" class="faint">${esc(fix.category)}</span>
            </div>

            <p class="body-sm" style="margin:0 0 7pt;">${esc(fix.description)}</p>

            <div style="border:0.75pt solid ${PALETTE.rule};border-radius:4pt;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5pt 10pt;background:${PALETTE.paperTint};border-bottom:0.75pt solid ${PALETTE.rule};">
                <span style="font-size:6.8pt;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;" class="faint">Copy this</span>
              </div>
              <div class="paste" style="border-radius:0;"><pre>${esc(fix.content)}</pre></div>
            </div>
          </div>`;
        })
        .join("");

      return sheet(
        `${pageHead("Suggested fixes", `07.${pad2(pageIndex + 1)}`)}
        ${
          pageIndex === 0
            ? `<div class="lede">
                 Drafted from the supplied website evidence. Verify all business claims and replace
                 bracketed placeholders before publishing. Re-audit and measure actual outcomes.
               </div>`
            : ""
        }
        ${label(`${report.fixes.length} assets in this kit`)}
        <div class="spacer"></div>
        ${cards}`,
        { footLeft, footRight: "Suggested fixes" },
      );
    })
    .join("");
}
