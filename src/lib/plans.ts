export const PLAN_IDS = {
  free: "free",
  oneSite499: "one_site_499",
  deep999: "deep_999",
  agency2999: "agency_2999",
} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

/** Re-scan voucher validity after the first deep audit on a Full Intelligence purchase. */
export const RESCAN_WINDOW_DAYS = 60;

export function rescanWindowExpiresFrom(useDate: Date = new Date()): Date {
  return new Date(useDate.getTime() + RESCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export type AuditType = "quick" | "standard" | "deep" | "rescan";

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  quick: "Quick",
  standard: "Standard",
  deep: "Deep",
  rescan: "Re-scan",
};

/** Audit types users can run and filter by in the dashboard. */
export const AUDIT_FILTER_TYPES: AuditType[] = [
  "quick",
  "standard",
  "deep",
  "rescan",
];

export const PLAN_LABELS: Record<PlanId, string> = {
  [PLAN_IDS.free]: "Free",
  [PLAN_IDS.oneSite499]: "Fix My Site",
  [PLAN_IDS.deep999]: "Full Intelligence",
  [PLAN_IDS.agency2999]: "Agency",
};

export function planToAuditType(planId: PlanId): AuditType {
  switch (planId) {
    case PLAN_IDS.oneSite499:
      return "standard";
    case PLAN_IDS.deep999:
      return "deep";
    case PLAN_IDS.agency2999:
      return "standard";
    default:
      return "quick";
  }
}

/** Buyer-facing depth bucket (no page/persona counts). */
export type AuditDepthKind = "quick" | "standard" | "deep" | "rescan";

/**
 * Resolve user-facing audit depth from audit type and/or plan.
 * Prefer auditType when present; fall back to plan defaults.
 */
export function auditDepthKind(input: {
  auditType?: AuditType | string | null;
  planId?: PlanId | string | null;
}): AuditDepthKind {
  const t = input.auditType;
  if (t === "rescan" || t === "deep" || t === "standard" || t === "quick") {
    return t;
  }
  const plan = input.planId as PlanId | null | undefined;
  if (plan && plan in PLAN_LABELS) {
    return planToAuditType(plan);
  }
  return "quick";
}

export function formatPlanBadge(planId: PlanId, domain?: string | null): string {
  const label = PLAN_LABELS[planId] ?? "Free";
  if (domain && planId !== PLAN_IDS.free && planId !== PLAN_IDS.agency2999) {
    return `${label} · ${domain}`;
  }
  return label;
}

export function formatRescanExpiry(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export type ProductChoice =
  | "free_quick"
  | "standard_purchase"
  | "deep_purchase"
  | "standard_audit"
  | "deep_audit"
  | "rescan"
  | "reopen_report"
  | "agency_standard"
  | "agency_deep";

export const PRODUCT_PRICES_INR: Partial<Record<PlanId, number>> = {
  [PLAN_IDS.oneSite499]: 499,
  [PLAN_IDS.deep999]: 999,
  [PLAN_IDS.agency2999]: 2999,
};

export const PRODUCT_METADATA: Record<
  PlanId,
  {
    pages: number;
    personas: number;
    timeEstimate: string;
    features: string[];
  }
> = {
  [PLAN_IDS.free]: {
    pages: 3,
    personas: 3,
    timeEstimate: "1–2 min",
    features: ["Ghost Score (number only)", "Top 2 ghost spots"],
  },
  [PLAN_IDS.oneSite499]: {
    pages: 8,
    personas: 10,
    timeEstimate: "~2 min",
    features: [
      "Full score breakdown",
      "All ghost spots with quotes",
      "Growth Kit fixes",
      "PDF export",
    ],
  },
  [PLAN_IDS.deep999]: {
    pages: 20,
    personas: 25,
    timeEstimate: "5–10 min",
    features: [
      "Everything in Fix My Site",
      "Competitor intelligence",
      "Industry comparison (coming soon)",
      "1 re-scan within 60 days",
    ],
  },
  [PLAN_IDS.agency2999]: {
    pages: 8,
    personas: 25,
    timeEstimate: "~2 min",
    features: ["30 Standard audits / month", "Multi-client dashboard", "Branded PDFs"],
  },
};

export function isPaidPlan(planId: PlanId): boolean {
  return (
    planId === PLAN_IDS.oneSite499 ||
    planId === PLAN_IDS.deep999 ||
    planId === PLAN_IDS.agency2999
  );
}

export function siteFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}
