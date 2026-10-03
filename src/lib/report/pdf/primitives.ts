import { PALETTE, withAlpha } from "./theme";

/** HTML-escape. Every value interpolated into the report must pass through this. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SheetOptions = {
  /** Full-bleed dark sheet (cover / back cover). */
  dark?: boolean;
  /** Left-hand footer text; omitted on dark sheets. */
  footLeft?: string;
  /** Right-hand footer text — section name, not a physical page number. */
  footRight?: string;
};

/**
 * One sheet of the report.
 *
 * Uses `min-height` rather than a fixed height on purpose: content that runs
 * long spills onto a continuation page instead of being clipped. Losing a
 * finding to an overflow rule would be worse than an uneven page.
 */
export function sheet(body: string, options: SheetOptions = {}): string {
  const { dark = false, footLeft, footRight } = options;

  const foot =
    !dark && (footLeft || footRight)
      ? `<div class="sheet__foot"><span>${esc(footLeft ?? "")}</span><span>${esc(footRight ?? "")}</span></div>`
      : "";

  if (dark) {
    return `<section class="sheet"><div class="bleed">${body}</div></section>`;
  }

  return `<section class="sheet"><div class="sheet__body">${body}</div>${foot}</section>`;
}

/** Section header: title on the left, section index on the right. */
export function pageHead(title: string, index?: string): string {
  return `<div class="page-head">
    <h2>${esc(title)}</h2>
    ${index ? `<span class="idx">${esc(index)}</span>` : ""}
  </div>`;
}

export function badge(text: string, color: string): string {
  return `<span class="badge" style="background:${withAlpha(color, 0.12)};color:${color};">${esc(text)}</span>`;
}

export function label(text: string): string {
  return `<div class="label">${esc(text)}</div>`;
}

/**
 * Horizontal score bar. Drawn as divs rather than SVG — Chromium's print
 * rasteriser handles block backgrounds more predictably than nested SVG at
 * small sizes.
 */
export function bar(value: number, color: string, height = 6): string {
  const pct = Math.max(0, Math.min(100, value));
  return `<div style="background:${PALETTE.ruleSoft};border-radius:${height}pt;height:${height}pt;overflow:hidden;">
    <div style="width:${pct}%;height:${height}pt;background:${color};border-radius:${height}pt;"></div>
  </div>`;
}

/** A labelled bar row: name, bar, value. */
export function barRow(
  name: string,
  value: number,
  color: string,
  meta?: string,
): string {
  return `<div style="margin-bottom:9pt;" class="avoid-break">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3pt;">
      <span style="font-size:9pt;font-weight:600;">${esc(name)}</span>
      <span style="font-size:9pt;font-weight:600;font-variant-numeric:tabular-nums;">${Math.round(value)}<span class="faint" style="font-weight:400;"> / 100</span></span>
    </div>
    ${bar(value, color)}
    ${meta ? `<div style="margin-top:3pt;font-size:7.4pt;" class="faint">${esc(meta)}</div>` : ""}
  </div>`;
}

/** Ghost Score donut. SVG so the arc stays crisp at print resolution. */
export function donut(
  score: number,
  color: string,
  size = 150,
  onDark = false,
): string {
  const r = 62;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const track = onDark ? "rgba(255,255,255,0.13)" : PALETTE.ruleSoft;
  const numColor = onDark ? PALETTE.onDark : color;
  const subColor = onDark ? PALETTE.onDarkMuted : PALETTE.faint;

  return `<svg width="${size}" height="${size}" viewBox="0 0 150 150" style="display:block;">
    <circle cx="75" cy="75" r="${r}" fill="none" stroke="${track}" stroke-width="11"/>
    <circle cx="75" cy="75" r="${r}" fill="none" stroke="${color}" stroke-width="11"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
      transform="rotate(-90 75 75)"/>
    <text x="75" y="76" text-anchor="middle" dominant-baseline="central"
      font-family="Space Grotesk, sans-serif" font-size="40" font-weight="700"
      letter-spacing="-1.5" fill="${numColor}">${Math.round(pct)}</text>
    <text x="75" y="101" text-anchor="middle" dominant-baseline="central"
      font-family="Inter, sans-serif" font-size="10" fill="${subColor}">out of 100</text>
  </svg>`;
}

export function quoteCallout(text: string, attribution?: string): string {
  return `<div class="quote">
    <p>${esc(text)}</p>
    ${attribution ? `<div class="attrib">${esc(attribution)}</div>` : ""}
  </div>`;
}

/** Pass/fail evidence line from a Ghost Score check. */
export function evidenceRow(
  passed: boolean,
  name: string,
  points: number,
  evidence?: string,
): string {
  const mark = passed ? "✓" : "✕";
  const color = passed ? PALETTE.positive : "#C2410C";
  return `<div class="avoid-break" style="display:flex;gap:8pt;padding:6pt 0;border-bottom:0.75pt solid ${PALETTE.ruleSoft};">
    <span style="flex:none;width:11pt;height:11pt;border-radius:11pt;background:${withAlpha(color, 0.12)};color:${color};font-size:7pt;font-weight:700;text-align:center;line-height:11pt;">${mark}</span>
    <div style="flex:1 1 auto;min-width:0;">
      <div style="font-size:8.8pt;font-weight:600;">${esc(name)}</div>
      ${evidence ? `<div style="font-size:8pt;line-height:1.45;margin-top:1.5pt;" class="muted">${esc(evidence)}</div>` : ""}
    </div>
    <span style="flex:none;font-size:8pt;font-weight:600;font-variant-numeric:tabular-nums;color:${passed ? PALETTE.positive : PALETTE.faint};white-space:nowrap;">${passed ? `+${points}` : `0 of ${points}`}</span>
  </div>`;
}

/** Confidence as a small filled track — the report's visual certainty cue. */
export function confidenceMeter(confidence: number, accent: string): string {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return `<div style="display:flex;align-items:center;gap:6pt;">
    <span class="label" style="margin:0;">Confidence</span>
    <div style="width:46pt;">${bar(pct, accent, 4)}</div>
    <span style="font-size:7.6pt;font-weight:600;font-variant-numeric:tabular-nums;" class="muted">${pct}%</span>
  </div>`;
}

/** Chunk a list so each sheet holds a predictable amount. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
