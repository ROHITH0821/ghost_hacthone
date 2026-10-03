import { PALETTE, SEVERITY_COLOR, withAlpha } from "../theme";
import { esc, label, pageHead, sheet } from "../primitives";
import type { ReportContext } from "../context";
import { formatPeriod } from "@/lib/data-sources/ga4/evidence";

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

/**
 * Emits a dedicated Google Analytics 4 verified performance sheet.
 * Only rendered when GA4 analytics evidence is present.
 */
export function analyticsSheet(ctx: ReportContext): string {
  const { analyticsEvidence, footLeft } = ctx;
  if (!analyticsEvidence) return "";

  const { snapshot, activeUserChangePercent } = analyticsEvidence;
  const { current, previous } = snapshot;
  const periodStr = formatPeriod(snapshot.period);

  const deltaHtml =
    activeUserChangePercent !== null
      ? `<span style="font-size:8.5pt;font-weight:600;color:${
          activeUserChangePercent >= 0 ? PALETTE.positive : SEVERITY_COLOR.critical
        };margin-left:6pt;">${activeUserChangePercent >= 0 ? "+" : ""}${activeUserChangePercent}% vs prior 30d</span>`
      : "";

  // Device rows
  const totalDeviceSessions = snapshot.devices.reduce((acc, d) => acc + (d.sessions ?? 0), 0);
  const deviceRows = snapshot.devices
    .slice(0, 4)
    .map((d) => {
      const share = totalDeviceSessions > 0 && d.sessions !== null ? ((d.sessions / totalDeviceSessions) * 100).toFixed(1) : "0";
      return `<tr style="border-bottom:0.75pt solid ${PALETTE.ruleSoft};">
        <td style="padding:6pt 0;font-size:8.5pt;font-weight:600;text-transform:capitalize;">${esc(d.category)}</td>
        <td style="padding:6pt 0;font-size:8.5pt;text-align:right;">${formatNumber(d.sessions)}</td>
        <td style="padding:6pt 0;font-size:8.5pt;text-align:right;color:${PALETTE.muted};">${share}%</td>
      </tr>`;
    })
    .join("");

  // Traffic sources rows
  const totalAcqSessions = snapshot.acquisition.reduce((acc, a) => acc + (a.sessions ?? 0), 0);
  const acqRows = snapshot.acquisition
    .slice(0, 5)
    .map((a) => {
      const share = totalAcqSessions > 0 && a.sessions !== null ? ((a.sessions / totalAcqSessions) * 100).toFixed(1) : "0";
      return `<tr style="border-bottom:0.75pt solid ${PALETTE.ruleSoft};">
        <td style="padding:6pt 0;font-size:8.5pt;font-weight:600;">${esc(a.source)} <span style="font-size:7.5pt;color:${PALETTE.muted};font-weight:normal;">/ ${esc(a.medium)}</span></td>
        <td style="padding:6pt 0;font-size:8.5pt;text-align:right;">${formatNumber(a.sessions)}</td>
        <td style="padding:6pt 0;font-size:8.5pt;text-align:right;color:${PALETTE.muted};">${share}%</td>
      </tr>`;
    })
    .join("");

  return sheet(
    `${pageHead("Verified Performance — GA4", "04b")}

    <div class="lede" style="display:flex;align-items:baseline;justify-content:space-between;gap:12pt;">
      <div>
        Live visitor telemetry verified via Google Analytics 4.
        Period: <strong>${esc(periodStr)}</strong>.
      </div>
      <span style="font-size:7.5pt;color:#7c3aed;background:#7c3aed15;border:0.75pt solid #7c3aed40;padding:2pt 6pt;border-radius:4pt;text-transform:uppercase;font-weight:600;letter-spacing:0.08em;white-space:nowrap;">
        Connected Data Source
      </span>
    </div>

    <!-- 4 KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8pt;margin:14pt 0 18pt 0;">
      <div style="border:0.75pt solid ${PALETTE.ruleSoft};background:${PALETTE.paper};padding:10pt 12pt;border-radius:6pt;">
        ${label("Active Visitors")}
        <div style="font-family:'Space Grotesk',sans-serif;font-size:18pt;font-weight:700;color:${PALETTE.ink};margin-top:2pt;">
          ${formatNumber(current.activeUsers)}
        </div>
        <div style="margin-top:2pt;">${deltaHtml}</div>
      </div>

      <div style="border:0.75pt solid ${PALETTE.ruleSoft};background:${PALETTE.paper};padding:10pt 12pt;border-radius:6pt;">
        ${label("Total Sessions")}
        <div style="font-family:'Space Grotesk',sans-serif;font-size:18pt;font-weight:700;color:${PALETTE.ink};margin-top:2pt;">
          ${formatNumber(current.sessions)}
        </div>
        <div style="margin-top:2pt;font-size:7.5pt;color:${PALETTE.muted};">${formatNumber(current.views)} views</div>
      </div>

      <div style="border:0.75pt solid ${PALETTE.ruleSoft};background:${PALETTE.paper};padding:10pt 12pt;border-radius:6pt;">
        ${label("Engagement Rate")}
        <div style="font-family:'Space Grotesk',sans-serif;font-size:18pt;font-weight:700;color:${PALETTE.ink};margin-top:2pt;">
          ${formatPercent(current.engagementRate)}
        </div>
        <div style="margin-top:2pt;font-size:7.5pt;color:${PALETTE.muted};">
          ${current.engagementSeconds ? `${Math.round(current.engagementSeconds)}s avg duration` : "Engaged sessions"}
        </div>
      </div>

      <div style="border:0.75pt solid ${PALETTE.ruleSoft};background:${PALETTE.paper};padding:10pt 12pt;border-radius:6pt;">
        ${label("Conversion Rate")}
        <div style="font-family:'Space Grotesk',sans-serif;font-size:18pt;font-weight:700;color:${PALETTE.ink};margin-top:2pt;">
          ${formatPercent(current.sessionKeyEventRate)}
        </div>
        <div style="margin-top:2pt;font-size:7.5pt;color:${PALETTE.muted};">
          ${formatNumber(current.keyEvents)} key events
        </div>
      </div>
    </div>

    <!-- 2 Column: Traffic Sources & Device Distribution -->
    <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:14pt;margin-top:10pt;">
      <div style="border:0.75pt solid ${PALETTE.ruleSoft};padding:12pt;border-radius:6pt;">
        <div style="font-size:9pt;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${PALETTE.ink};margin-bottom:8pt;">
          Top Acquisition Sources
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1.5pt solid ${PALETTE.ruleSoft};">
              <th style="font-size:7.5pt;text-align:left;padding-bottom:4pt;color:${PALETTE.muted};">Source / Medium</th>
              <th style="font-size:7.5pt;text-align:right;padding-bottom:4pt;color:${PALETTE.muted};">Sessions</th>
              <th style="font-size:7.5pt;text-align:right;padding-bottom:4pt;color:${PALETTE.muted};">Share</th>
            </tr>
          </thead>
          <tbody>${acqRows || "<tr><td colspan='3' style='font-size:8pt;color:" + PALETTE.muted + ";padding:6pt 0;'>No source data available</td></tr>"}</tbody>
        </table>
      </div>

      <div style="border:0.75pt solid ${PALETTE.ruleSoft};padding:12pt;border-radius:6pt;">
        <div style="font-size:9pt;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${PALETTE.ink};margin-bottom:8pt;">
          Device Breakdown
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1.5pt solid ${PALETTE.ruleSoft};">
              <th style="font-size:7.5pt;text-align:left;padding-bottom:4pt;color:${PALETTE.muted};">Device</th>
              <th style="font-size:7.5pt;text-align:right;padding-bottom:4pt;color:${PALETTE.muted};">Sessions</th>
              <th style="font-size:7.5pt;text-align:right;padding-bottom:4pt;color:${PALETTE.muted};">Share</th>
            </tr>
          </thead>
          <tbody>${deviceRows || "<tr><td colspan='3' style='font-size:8pt;color:" + PALETTE.muted + ";padding:6pt 0;'>No device data available</td></tr>"}</tbody>
        </table>
      </div>
    </div>

    <!-- Notes & Provenance -->
    <div style="margin-top:14pt;border-top:0.75pt solid ${PALETTE.ruleSoft};padding-top:8pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:7pt;color:${PALETTE.muted};">
        Source: Google Analytics 4 Property ID ${esc(snapshot.propertyId)} · Stream ID ${esc(snapshot.streamId)} · Verified Evidence Layer
      </span>
      <span style="font-size:7pt;color:${PALETTE.muted};">
        Reliability: ${snapshot.reliable ? "Standard" : "Limited sample"}
      </span>
    </div>`,
    { footLeft, footRight: "Analytics Telemetry" },
  );
}
