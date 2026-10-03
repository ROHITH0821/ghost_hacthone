import type { Severity } from "@/lib/types";

/**
 * Design tokens and the report stylesheet.
 *
 * Page architecture note — the report needs a full-bleed dark cover *and* safe
 * margins on every page, including the continuation pages Chromium creates when
 * a section runs long. Those two pull against each other, so:
 *
 *   - `@page` carries real margins, which continuation pages inherit for free.
 *   - `.bleed` escapes them with matching negative margins to reach the paper
 *     edge. That is the standard print full-bleed trick and it keeps overflow
 *     text off the trim on every other page.
 *
 * Sheets are `min-height`, never fixed height, so content can never be clipped —
 * a long ghost spot spills onto a second page instead of being cut off.
 */

// Page box, in mm. Kept here because the sheet/bleed maths depends on them.
const PAGE_M_TOP = 16;
const PAGE_M_SIDE = 16;
const PAGE_M_BOTTOM = 14;
const SHEET_MIN_H = 297 - PAGE_M_TOP - PAGE_M_BOTTOM;

export const PALETTE = {
  ink: "#0F1115",
  inkSoft: "#3A3F4A",
  muted: "#6B7280",
  faint: "#9CA3AF",
  rule: "#E5E7EB",
  ruleSoft: "#F1F2F4",
  paper: "#FFFFFF",
  paperTint: "#FAFAFB",
  dark: "#101716",
  darkLift: "#18221F",
  onDark: "#F5F6F8",
  onDarkMuted: "#8A90A0",
  positive: "#15803D",
  positiveTint: "#F0FAF3",
  warn: "#B45309",
  warnTint: "#FFFBEB",
} as const;

/** Severity colours — unchanged from the previous generator so nothing shifts meaning. */
export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#38bdf8",
};

export const GAP_PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#16745f",
  low: "#94a3b8",
};

export function scoreColor(score: number): string {
  if (score >= 95) return "#22c55e";
  if (score >= 85) return "#38bdf8";
  if (score >= 70) return "#16745f";
  if (score >= 55) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export function scoreLabel(score: number): string {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 55) return "Needs Improvement";
  if (score >= 40) return "Weak";
  return "Critical";
}

/**
 * Blend a hex colour toward transparency. Computed in TS rather than via CSS
 * `color-mix()` so a white-label agency's custom `accentColor` behaves
 * predictably in the print renderer.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const int = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(int)) {
    // Unparseable brand colour — fall back to the product teal rather than
    // emitting invalid CSS that would silently drop the rule.
    return `rgba(22, 116, 95, ${alpha})`;
  }

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Readable foreground for a filled accent chip. */
export function onAccent(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(int)) return "#FFFFFF";

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Perceived luminance (ITU-R BT.601).
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 165 ? PALETTE.ink : "#FFFFFF";
}

export function buildStylesheet(accent: string, fontCss: string): string {
  const p = PALETTE;

  return `${fontCss}
  *, *::before, *::after { box-sizing: border-box; }

  @page {
    size: A4;
    margin: ${PAGE_M_TOP}mm ${PAGE_M_SIDE}mm ${PAGE_M_BOTTOM}mm;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: ${p.paper};
    color: ${p.ink};
    font-family: Inter, "Helvetica Neue", Arial, sans-serif;
    font-size: 9.6pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1, h2, h3, h4 {
    font-family: "Space Grotesk", Inter, sans-serif;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }

  p { margin: 0 0 6pt; }
  ul { margin: 4pt 0 6pt; padding-left: 14pt; }
  li { margin-bottom: 2.5pt; }

  /* ── Sheets ─────────────────────────────────────────────────────────── */

  .sheet {
    min-height: ${SHEET_MIN_H}mm;
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .sheet__body { flex: 1 1 auto; }

  /* Escapes the @page margin box to reach the paper edge. */
  .bleed {
    margin: -${PAGE_M_TOP}mm -${PAGE_M_SIDE}mm -${PAGE_M_BOTTOM}mm;
    width: 210mm;
    min-height: 297mm;
    padding: ${PAGE_M_TOP}mm ${PAGE_M_SIDE}mm ${PAGE_M_BOTTOM}mm;
    background: ${p.dark};
    color: ${p.onDark};
    display: flex;
    flex-direction: column;
  }

  /* ── Page furniture ─────────────────────────────────────────────────── */

  .eyebrow {
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${p.faint};
  }
  .eyebrow--accent { color: ${accent}; }

  .page-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12pt;
    padding-bottom: 5pt;
    border-bottom: 1.5pt solid ${p.ink};
    margin-bottom: 14pt;
  }
  .page-head h2 { font-size: 19pt; line-height: 1.1; }
  .page-head .idx {
    font-family: "Space Grotesk", sans-serif;
    font-size: 8pt;
    font-weight: 700;
    color: ${p.faint};
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .lede {
    font-size: 11pt;
    line-height: 1.5;
    color: ${p.inkSoft};
    margin-bottom: 14pt;
    max-width: 150mm;
  }

  .sheet__foot {
    margin-top: 14pt;
    padding-top: 6pt;
    border-top: 0.75pt solid ${p.rule};
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    letter-spacing: 0.06em;
    color: ${p.faint};
    text-transform: uppercase;
  }

  /* ── Type scale ─────────────────────────────────────────────────────── */

  .display { font-size: 46pt; line-height: 0.95; letter-spacing: -0.035em; }
  .h3 { font-size: 12.5pt; line-height: 1.25; margin-bottom: 4pt; }
  .h4 { font-size: 10.5pt; line-height: 1.3; margin-bottom: 3pt; }
  .label {
    font-size: 6.8pt;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${p.faint};
    margin-bottom: 3pt;
  }
  .body-sm { font-size: 8.8pt; line-height: 1.5; color: ${p.inkSoft}; }
  .muted { color: ${p.muted}; }
  .faint { color: ${p.faint}; }

  /* ── Components ─────────────────────────────────────────────────────── */

  .badge {
    display: inline-block;
    border-radius: 20pt;
    padding: 1.5pt 7pt;
    font-size: 6.8pt;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .chip {
    display: inline-block;
    border: 0.75pt solid ${p.rule};
    border-radius: 20pt;
    padding: 2pt 8pt;
    margin: 0 4pt 4pt 0;
    font-size: 8pt;
    color: ${p.inkSoft};
  }

  .card {
    border: 0.75pt solid ${p.rule};
    border-radius: 4pt;
    padding: 10pt 12pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .card + .card { margin-top: 8pt; }
  .card--tint { background: ${p.paperTint}; }

  .quote {
    border-left: 2.5pt solid ${accent};
    background: ${withAlpha(accent, 0.05)};
    padding: 9pt 12pt;
    border-radius: 0 4pt 4pt 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .quote p {
    font-size: 11pt;
    line-height: 1.45;
    color: ${p.ink};
    margin: 0;
  }
  .quote .attrib {
    margin-top: 5pt;
    font-size: 7pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${p.muted};
  }

  .stat-row { display: flex; gap: 10pt; }
  .stat {
    flex: 1;
    border: 0.75pt solid ${p.rule};
    border-radius: 4pt;
    padding: 9pt 10pt;
  }
  .stat .v {
    font-family: "Space Grotesk", sans-serif;
    font-size: 22pt;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .stat .k {
    margin-top: 4pt;
    font-size: 7pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${p.muted};
  }

  .impact-strip {
    background: ${p.warnTint};
    border: 0.75pt solid #F3E1BC;
    border-radius: 4pt;
    padding: 7pt 10pt;
    color: ${p.warn};
    font-size: 9pt;
  }

  .fixbox {
    background: ${p.positiveTint};
    border: 0.75pt solid #CFE9D8;
    border-radius: 4pt;
    padding: 9pt 11pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .paste {
    background: ${p.ink};
    color: #E8EAF0;
    border-radius: 4pt;
    padding: 9pt 11pt;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 8pt;
    line-height: 1.5;
    margin: 0;
  }

  .note {
    background: ${p.warnTint};
    border: 0.75pt solid #F0D98A;
    border-radius: 4pt;
    padding: 9pt 12pt;
    font-size: 8.5pt;
    color: #6B5A1A;
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt 16pt; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }

  table { width: 100%; border-collapse: collapse; }
  th, td {
    text-align: left;
    padding: 5pt 6pt;
    border-bottom: 0.75pt solid ${p.ruleSoft};
    font-size: 8.4pt;
    vertical-align: top;
  }
  th {
    font-size: 6.8pt;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${p.faint};
    border-bottom: 1pt solid ${p.rule};
  }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }

  .rule { height: 0.75pt; background: ${p.rule}; margin: 12pt 0; }
  .spacer { height: 10pt; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  `;
}
