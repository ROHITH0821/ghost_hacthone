import type { ContextPack, ContextPackPage } from "../types";
import type { ScoreCheck } from "./types";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalize(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function anyMatch(haystack: string, patterns: Array<RegExp | string>): boolean {
  const n = normalize(haystack);
  return patterns.some((p) => (typeof p === "string" ? n.includes(normalize(p)) : p.test(n)));
}

export function findPage(pack: ContextPack, predicate: (p: ContextPackPage) => boolean) {
  return pack.pages.find(predicate);
}

export function pageText(pack: ContextPack): string {
  const parts: string[] = [];
  parts.push(pack.business.name, pack.business.type, pack.business.location);
  parts.push(pack.nav_structure.join(" | "));
  parts.push(pack.contact_paths.join(" | "));
  parts.push(pack.trust_signals.join(" | "));
  for (const p of pack.pages) {
    parts.push(p.title, p.summary, p.prices_visible, p.ctas.join(" | "), p.visual_notes);
  }
  return parts.filter(Boolean).join("\n");
}

export function hasNavItem(pack: ContextPack, patterns: Array<RegExp | string>): boolean {
  return anyMatch(pack.nav_structure.join(" "), patterns);
}

export function hasCta(pack: ContextPack, patterns: Array<RegExp | string>): boolean {
  return pack.pages.some((p) => anyMatch(p.ctas.join(" "), patterns));
}

export function homepage(pack: ContextPack): ContextPackPage | undefined {
  return pack.pages[0];
}

export function pricesAnyVisible(pack: ContextPack): boolean {
  return pack.pages.some((p) => {
    const pv = normalize(p.prices_visible);
    return pv !== "" && pv !== "none" && !pv.includes("none");
  });
}

export function pricesAllVisible(pack: ContextPack): boolean {
  return pack.pages.some((p) => normalize(p.prices_visible) === "all");
}

export function hasContact(pack: ContextPack, patterns: Array<RegExp | string>): boolean {
  return anyMatch(pack.contact_paths.join(" "), patterns);
}

export function hasPhone(pack: ContextPack): boolean {
  return hasContact(pack, [/phone/, /call/]) || /(\+?\d[\d\s-]{8,}\d)/.test(pack.contact_paths.join(" "));
}

export function hasEmail(pack: ContextPack): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(pack.contact_paths.join(" "));
}

export function hasWhatsApp(pack: ContextPack): boolean {
  return hasContact(pack, [/whatsapp/, /wa\.me/, /click to chat/]);
}

export function isLocationStated(pack: ContextPack): boolean {
  const loc = normalize(pack.business.location);
  return loc !== "" && !/(not stated|unknown|n\/?a)/i.test(loc);
}

export function applyChecklist(
  base: number,
  checks: ScoreCheck[],
): { value: number; checks: ScoreCheck[] } {
  const sum = checks.reduce((s, c) => s + c.points, 0);
  return { value: clamp(base + sum, 0, 100), checks };
}

