import { z } from "zod";
import type { GhostReport } from "@/lib/types";

export const FIX_SHARE_DAYS = 30;
export const FIX_SHARE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** These links are rendered, never fetched by the server. */
export function safePageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export const HandoffInputSchema = z.object({
  issue: z.string().trim().min(1, "Describe the issue.").max(8000),
  pageUrl: z.string().trim().max(2048).refine(value => Boolean(safePageUrl(value)), "Enter a complete http:// or https:// page URL without embedded credentials."),
  suggestedChange: z.string().trim().min(1, "Add a suggested change.").max(32000),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).min(1, "Add at least one acceptance check.").max(12),
}).strict();
export type HandoffInput = z.infer<typeof HandoffInputSchema>;
export const HandoffSnapshotSchema = HandoffInputSchema.extend({
  version: z.literal(1), title: z.string().max(300), domain: z.string().max(253),
}).strict();
export type HandoffSnapshot = z.infer<typeof HandoffSnapshotSchema>;
export type ShareDetails = { path: string; expiresAt: string };
export type HandoffEditorData = { draft: HandoffSnapshot; share: ShareDetails | null };

function checklist(category: string): string[] {
  const specific = /price|pricing|package/i.test(category)
    ? "The affected page clearly states the confirmed price or quote process and what is included."
    : /contact|form|booking|whatsapp|cta/i.test(category)
      ? "The affected contact or booking action reaches the intended destination and shows a clear next step."
      : /trust|review|testimonial/i.test(category)
        ? "Every added claim, review or trust statement is supported by information approved by the site owner."
        : "The described issue is addressed on the affected page using the reviewed suggested change.";
  return [specific,
    "All bracketed placeholders are replaced with confirmed business information before publishing.",
    "The change is readable and usable on mobile and desktop, and affected links or controls still work.",
    "Share the updated page URL and a screenshot with the owner for review."];
}

/** Allowlist: no internal notes, shopper quotes, GA4 data, account IDs or other findings. */
export function buildHandoffDraft(fix: {
  title: string; category: string | null; pageUrl: string | null;
  leakId: string | null; fixId: string | null; fixContent: string | null;
}, report: GhostReport | null, domain: string): HandoffSnapshot {
  const kit = report?.fixes?.find(item => item.id === fix.fixId);
  const leak = report?.leaks?.find(item => item.id === fix.leakId) ??
    (kit ? report?.leaks?.find(item => item.fix?.title === kit.title && item.fix?.content === kit.content) : undefined);
  const candidate = fix.pageUrl || leak?.category || "";
  // Labels such as "Services" are not evidence of a specific URL.
  let pageUrl = safePageUrl(candidate) ?? "";
  if (!pageUrl && /^\/(?!\/)/.test(candidate) && report?.url) {
    try { pageUrl = safePageUrl(new URL(candidate, report.url).href) ?? ""; } catch { /* owner supplies URL */ }
  }
  if (pageUrl) {
    const clean = new URL(pageUrl);
    clean.search = ""; clean.hash = "";
    pageUrl = clean.href;
  }
  return {
    version: 1, title: fix.title.slice(0, 300), domain: domain.slice(0, 253),
    issue: (leak?.whatIsWrong || kit?.description || fix.title).slice(0, 8000), pageUrl,
    suggestedChange: (fix.fixContent || leak?.howToFix || kit?.content || "").slice(0, 32000),
    acceptanceCriteria: checklist(`${fix.category ?? ""} ${fix.title}`),
  };
}

export function handoffText(snapshot: HandoffSnapshot): string {
  return [snapshot.title, `Website: ${snapshot.domain}`, `Affected page: ${snapshot.pageUrl}`,
    "", "Issue", snapshot.issue, "", "Suggested change", snapshot.suggestedChange,
    "", "Acceptance checklist", ...snapshot.acceptanceCriteria.map(item => `- [ ] ${item}`),
    "", "Based on a Ghost audit. Confirm the finding on the live page before implementing."].join("\n");
}
