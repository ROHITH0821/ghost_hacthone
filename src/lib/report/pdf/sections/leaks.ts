import type { ConversionLeak, Severity } from "@/lib/types";
import { PALETTE, SEVERITY_COLOR, withAlpha } from "../theme";
import { badge, esc, label, pad2, pageHead, sheet } from "../primitives";
import type { ReportContext } from "../context";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Leaks worst-first, so the numbering in the report means something. */
export function orderedLeaks(leaks: ConversionLeak[]): ConversionLeak[] {
  return [...leaks].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

/** Contents page for the findings — the map before the territory. */
export function leaksIndexSheet(ctx: ReportContext): string {
  const { report, footLeft } = ctx;
  const leaks = orderedLeaks(report.leaks);
  if (leaks.length === 0) return "";

  const rows = leaks
    .map((leak, i) => {
      const color = SEVERITY_COLOR[leak.severity];
      const isPriority = ctx.analyticsEvidence?.priorityFindingIds?.includes(leak.id);
      const priorityBadge = isPriority
        ? `<span style="margin-left:6pt;font-size:6.8pt;color:#16745F;border:0.75pt solid #16745F;padding:1.5pt 4pt;border-radius:3pt;text-transform:uppercase;font-weight:600;">High Traffic</span>`
        : "";
      return `<div class="avoid-break" style="display:flex;gap:12pt;align-items:flex-start;padding:9pt 0;border-bottom:0.75pt solid ${PALETTE.ruleSoft};">
        <span style="flex:none;font-family:'Space Grotesk',sans-serif;font-size:15pt;font-weight:700;color:${color};line-height:1;width:22pt;">${pad2(i + 1)}</span>
        <div style="flex:1 1 auto;min-width:0;">
          <div style="font-size:10.5pt;font-weight:600;line-height:1.3;">${esc(leak.title)}</div>
          <div style="margin-top:2pt;font-size:7.8pt;" class="faint">${esc(leak.category)}${priorityBadge}</div>
        </div>
        <span style="flex:none;">${badge(leak.severity, color)}</span>
      </div>`;
    })
    .join("");

  return sheet(
    `${pageHead("Findings to prioritize", "06")}

    <div class="lede">
      ${leaks.length} finding${leaks.length === 1 ? "" : "s"}, ranked by simulated friction and flow importance.
      Each one gets its own page: the observed obstacle, a simulated perspective, and what to review.
    </div>

    ${rows}`,
    { footLeft, footRight: "Findings" },
  );
}

/** One sheet per finding: problem → why they leave → impact → fix. */
export function leakSheets(ctx: ReportContext): string {
  const { report, footLeft } = ctx;

  return orderedLeaks(report.leaks)
    .map((leak, i) => {
      const color = SEVERITY_COLOR[leak.severity];

      const fixBlock = leak.fix
        ? `<div class="fixbox" style="margin-top:8pt;">
             <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10pt;margin-bottom:6pt;">
               <span style="font-size:9.5pt;font-weight:600;color:${PALETTE.positive};">${esc(leak.fix.title)}</span>
               <span style="font-size:6.8pt;letter-spacing:0.12em;text-transform:uppercase;" class="faint">Ready to paste</span>
             </div>
             <div class="paste"><pre>${esc(leak.fix.content)}</pre></div>
           </div>`
        : "";

      return sheet(
        `<div style="display:flex;align-items:flex-start;gap:14pt;padding-bottom:8pt;border-bottom:1.5pt solid ${PALETTE.ink};margin-bottom:14pt;">
          <span style="flex:none;font-family:'Space Grotesk',sans-serif;font-size:34pt;font-weight:700;line-height:0.85;color:${color};">${pad2(i + 1)}</span>
          <div style="flex:1 1 auto;min-width:0;">
            <div style="display:flex;align-items:center;gap:8pt;flex-wrap:wrap;margin-bottom:4pt;">
              ${badge(leak.severity, color)}
              <span style="font-size:7.6pt;" class="faint">${esc(leak.category)}</span>
            </div>
            <h2 style="font-size:17pt;line-height:1.2;">${esc(leak.title)}</h2>
          </div>
        </div>

        <div style="border-left:2.5pt solid ${color};background:${withAlpha(color, 0.05)};border-radius:0 4pt 4pt 0;padding:11pt 14pt;">
          ${label("Why customers leave")}
          <p style="margin:0;font-size:12pt;line-height:1.45;">${esc(leak.whyCustomersLeave)}</p>
        </div>

        <div style="margin-top:14pt;">
          ${label("What's wrong")}
          <p class="body-sm" style="font-size:9.6pt;">${esc(leak.whatIsWrong)}</p>
        </div>

        <div class="impact-strip" style="margin-top:10pt;">
          <span style="font-size:6.8pt;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Impact</span>
          <div style="margin-top:2pt;font-size:9.6pt;font-weight:600;">${esc(leak.impact)}</div>
        </div>

        ${(() => {
          const findingEv = ctx.analyticsEvidence?.findings?.find((f) => f.findingId === leak.id);
          if (!findingEv) return "";
          return `<div style="margin-top:10pt;border:0.75pt solid #7c3aed40;background:#7c3aed0a;border-radius:4pt;padding:8pt 10pt;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4pt;">
              <span style="font-size:7pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">
                GA4 Behavioural Evidence (${esc(findingEv.path)})
              </span>
              <span style="font-size:6.5pt;color:${PALETTE.muted};">Verified Telemetry</span>
            </div>
            <div style="font-size:8pt;line-height:1.4;color:${PALETTE.ink};">
              <strong>Data:</strong> ${[
                findingEv.views !== null ? `${findingEv.views.toLocaleString()} views` : null,
                findingEv.landingSessions !== null ? `${findingEv.landingSessions.toLocaleString()} landing sessions` : null,
                findingEv.engagementRate !== null ? `${(findingEv.engagementRate <= 1 ? findingEv.engagementRate * 100 : findingEv.engagementRate).toFixed(1)}% engagement` : null,
                findingEv.sessionKeyEventRate !== null ? `${(findingEv.sessionKeyEventRate <= 1 ? findingEv.sessionKeyEventRate * 100 : findingEv.sessionKeyEventRate).toFixed(2)}% conv.` : null,
              ].filter(Boolean).join(" · ")}
            </div>
            ${findingEv.observation ? `<div style="margin-top:3pt;font-size:7.5pt;color:${PALETTE.muted};"><strong>Observation:</strong> ${esc(findingEv.observation)}</div>` : ""}
            ${findingEv.interpretation ? `<div style="margin-top:3pt;font-size:7.5pt;color:${PALETTE.muted};"><strong>Impact:</strong> ${esc(findingEv.interpretation)}</div>` : ""}
          </div>`;
        })()}

        <div class="rule"></div>

        <div>
          ${label("How to fix it")}
          <p class="body-sm" style="font-size:9.6pt;">${esc(leak.howToFix)}</p>
          ${fixBlock}
        </div>`,
        { footLeft, footRight: `Finding ${pad2(i + 1)}` },
      );
    })
    .join("");
}
