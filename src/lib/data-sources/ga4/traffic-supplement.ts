import type { AnalyticsSnapshot } from "../types";

/** Only the reporting facts needed by aggregation; no connection/credential metadata. */
export type TrafficSupplement = {
  source: "google_analytics_4";
  dateRange: { start: string; end: string };
  summary: {
    activeUsers: number | null;
    sessions: number | null;
    pageViews: number | null;
    engagementRate: number | null;
    sessionKeyEventRate: number | null;
  };
  pages: Array<{
    path: string;
    pageViews: number | null;
    landingSessions: number | null;
    engagementRate: number | null;
    sessionKeyEventRate: number | null;
  }>;
  trafficSources: Array<{ source: string; medium: string; sessions: number | null }>;
  devices: Array<{ device: string; sessions: number | null }>;
  hasVerifiedRevenue: boolean;
};

/** Stage 4 receives one page, without site totals, acquisition, devices or other pages. */
export type PageTrafficSupplement = Pick<TrafficSupplement, "source" | "dateRange"> & {
  page: TrafficSupplement["pages"][number];
};

/** Case-sensitive paths: URL paths can differ by case. Invalid/non-path labels stay unmatched. */
export function normalizePath(value: string): string {
  const input = value.trim();
  if (!input || (!input.startsWith("/") && !/^https?:\/\//i.test(input))) return "";
  try {
    const url = new URL(input, "https://ga4-path.invalid");
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch { return ""; }
}

const descending = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1);

export function buildTrafficSupplement(snapshot: AnalyticsSnapshot): TrafficSupplement {
  const paths = new Set([...snapshot.pages, ...snapshot.landingPages].map(p => normalizePath(p.path)).filter(Boolean));
  const pages = [...paths].map(path => {
    const views = snapshot.pages.filter(p => normalizePath(p.path) === path);
    const landings = snapshot.landingPages.filter(p => normalizePath(p.path) === path);
    // Do not add path variants or average their rates without a verified aggregation.
    // Ambiguous rows are unavailable, rather than selecting one arbitrary variant.
    const page = views.length === 1 ? views[0] : null;
    const landing = landings.length === 1 ? landings[0] : null;
    return {
      path, pageViews: page?.views ?? null, landingSessions: landing?.sessions ?? null,
      engagementRate: landing?.engagementRate ?? null,
      sessionKeyEventRate: snapshot.keyEventConfiguration === "present" ? landing?.sessionKeyEventRate ?? null : null,
    };
  }).sort((a, b) => descending(a.pageViews, b.pageViews)).slice(0, 50);

  return {
    source: "google_analytics_4",
    dateRange: { start: snapshot.period.start, end: snapshot.period.end },
    summary: {
      activeUsers: snapshot.current.activeUsers, sessions: snapshot.current.sessions,
      pageViews: snapshot.current.views, engagementRate: snapshot.current.engagementRate,
      sessionKeyEventRate: snapshot.keyEventConfiguration === "present" ? snapshot.current.sessionKeyEventRate : null,
    },
    pages,
    trafficSources: [...snapshot.acquisition].sort((a, b) => descending(a.sessions, b.sessions)).slice(0, 10)
      .map(({ source, medium, sessions }) => ({ source, medium, sessions })),
    devices: snapshot.devices.map(({ category, sessions }) => ({ device: category, sessions })),
    hasVerifiedRevenue: snapshot.reliable && snapshot.revenue.purchases !== null && snapshot.revenue.purchaseRevenue !== null,
  };
}

/** Optional cache lookup boundary: neither missing GA4 nor a lookup failure can stop an audit. */
export async function loadTrafficSupplement(
  getSnapshot: () => Promise<AnalyticsSnapshot | null>,
): Promise<TrafficSupplement | null> {
  try {
    const snapshot = await getSnapshot();
    // Respect the snapshot's existing reliability flag before stripping internal metadata.
    return snapshot?.reliable ? buildTrafficSupplement(snapshot) : null;
  } catch { return null; }
}

/** Shared engine/report matching. Explicit page locations outrank prose and keyword fallbacks. */
export function matchTrafficPage(
  finding: { page?: string; category?: string; title?: string; whatIsWrong?: string; howToFix?: string },
  pages: ReadonlyArray<{ path: string }>,
): string | null {
  const paths = [...new Set(pages.map(p => normalizePath(p.path)).filter(Boolean))];
  for (const location of [finding.page, finding.category]) {
    if (!location) continue;
    const direct = normalizePath(location);
    if (direct) return paths.includes(direct) ? direct : null;
  }

  const unique = (matches: string[]) => matches.length === 1 ? matches[0] : null;
  // Preserve keyword matching for labels such as "Pricing", but reject ambiguous candidates.
  const keywords = ["checkout", "cart", "pricing", "contact", "signup", "register", "login", "demo", "book", "product"];
  const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const matchText = (text: string) => {
    const directPaths = text.match(/https?:\/\/[^\s<>"']+|\/[a-zA-Z0-9][^\s<>"']*/g) ?? [];
    if (directPaths.length) return unique([...new Set(directPaths.map(normalizePath).filter(p => paths.includes(p)))]);
    // Retain the existing exact-path-name fallback (e.g. "Services" → /services).
    // Word boundaries avoid treating "cart" as a match for "cartoon".
    const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mentioned = paths.filter(path => path !== "/" && new RegExp(`(?:^|[^a-z0-9])${escaped(path.slice(1))}(?=$|[^a-z0-9])`, "i").test(text));
    if (mentioned.length) return unique(mentioned);
    const tokens = words(text);
    const matching = paths.filter(path => path !== "/" && keywords.some(kw => tokens.includes(kw) && words(path).includes(kw)));
    if (matching.length) return unique(matching);
    if (/\b(hero|headline|homepage)\b|above-the-fold|\blanding page\b/i.test(text) && paths.includes("/")) return "/";
    return null;
  };
  // The page/category label is stronger than unrelated pages mentioned in a suggested fix.
  for (const label of [finding.page, finding.category]) {
    if (label) {
      const match = matchText(label);
      if (match) return match;
    }
  }
  return matchText([finding.title, finding.whatIsWrong, finding.howToFix].filter(Boolean).join(" "));
}

export function trafficForFinding(
  traffic: TrafficSupplement | null | undefined,
  finding: Parameters<typeof matchTrafficPage>[0],
): PageTrafficSupplement | null {
  if (!traffic) return null;
  const path = matchTrafficPage(finding, traffic.pages);
  const page = traffic.pages.find(p => p.path === path);
  if (!page || [page.pageViews, page.landingSessions, page.engagementRate, page.sessionKeyEventRate].every(v => v === null)) return null;
  return { source: traffic.source, dateRange: { ...traffic.dateRange }, page: { ...page } };
}
