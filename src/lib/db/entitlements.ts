import { cache } from "react";
import {
  formatPlanBadge,
  formatRescanExpiry,
  PLAN_IDS,
  PRODUCT_METADATA,
  PRODUCT_PRICES_INR,
  type AuditType,
  type PlanId,
  type ProductChoice,
  planToAuditType,
  rescanWindowExpiresFrom,
} from "@/lib/plans";
import { canonicalizeDomain } from "@/lib/db/sites";
import {
  AGENCY_MONTHLY_AUDIT_LIMIT,
  ensurePeriodReset,
  getAgencyQuotaStatus,
} from "@/lib/db/agency-quota";
import { getOrCreateWorkspace } from "@/lib/db/agency-workspace";
import { isUserApproved } from "@/lib/db/users";
import { db } from "@/lib/db";

export type PlanSummary = {
  primaryPlanId: PlanId;
  planBadge: string;
  entitlementLabel: string;
  entitlementAction?: string;
  domain?: string | null;
  freeScansUsed: number;
  freeScanAvailable: boolean;
  rescansRemaining: number;
  rescansExpiresAt: Date | null;
  auditsUsedPeriod: number;
  auditsLimit: number | null;
  periodResetAt: Date | null;
};

export const ensureFreeEntitlement = cache(async (userId: string) => {
  const existing = await db.entitlement.findFirst({
    where: {
      userId,
      planId: PLAN_IDS.free,
      siteId: null,
    },
  });

  if (existing) return existing;

  return db.entitlement.create({
    data: {
      userId,
      planId: PLAN_IDS.free,
      status: "active",
    },
  });
});

export const getAccountEntitlements = cache(async (userId: string) => {
  await ensureFreeEntitlement(userId);

  return db.entitlement.findMany({
    where: { userId, status: "active" },
    include: { site: true },
    orderBy: { createdAt: "desc" },
  });
});

function pickPrimaryEntitlement(
  entitlements: Awaited<ReturnType<typeof getAccountEntitlements>>
) {
  const priority: PlanId[] = [
    PLAN_IDS.agency2999,
    PLAN_IDS.deep999,
    PLAN_IDS.oneSite499,
    PLAN_IDS.free,
  ];

  for (const planId of priority) {
    const match = entitlements.find((e) => e.planId === planId);
    if (match) return match;
  }

  return entitlements[0] ?? null;
}

function entitlementCardCopy(
  entitlement: NonNullable<
    Awaited<ReturnType<typeof getAccountEntitlements>>[number]
  >
): Pick<PlanSummary, "entitlementLabel" | "entitlementAction"> {
  const domain =
    entitlement.site?.canonicalDomain ??
    (entitlement.boundUrl ? canonicalizeDomain(entitlement.boundUrl) : null);

  switch (entitlement.planId as PlanId) {
    case PLAN_IDS.agency2999: {
      const limit = entitlement.auditsLimit ?? 30;
      return {
        entitlementLabel: `${entitlement.auditsUsedPeriod} / ${limit} Standard audits used`,
        entitlementAction: entitlement.periodResetAt
          ? `Resets ${formatRescanExpiry(entitlement.periodResetAt)}`
          : undefined,
      };
    }
    case PLAN_IDS.deep999:
      if (entitlement.rescansRemaining > 0 && entitlement.rescansExpiresAt) {
        return {
          entitlementLabel: `${entitlement.rescansRemaining} re-scan available until ${formatRescanExpiry(entitlement.rescansExpiresAt)}`,
          entitlementAction: "Use re-scan",
        };
      }
      if (entitlement.rescansRemaining > 0 && !entitlement.rescansExpiresAt) {
        return {
          entitlementLabel: "1 re-scan included",
          entitlementAction: "Starts when you run your first deep audit",
        };
      }
      if (!domain) {
        return {
          entitlementLabel: "Deep report ready to use",
          entitlementAction: "Start your first audit",
        };
      }
      return {
        entitlementLabel: "Deep report owned forever",
        entitlementAction: domain,
      };
    case PLAN_IDS.oneSite499:
      if (!domain) {
        return {
          entitlementLabel: "Standard report ready to use",
          entitlementAction: "Start your first audit",
        };
      }
      return {
        entitlementLabel: "Standard report owned forever",
        entitlementAction: domain,
      };
    default:
      return {
        entitlementLabel:
          entitlement.freeScansUsed > 0 ? "Free scan used" : "Free scan available",
        entitlementAction: entitlement.freeScansUsed > 0 ? "Choose an audit" : undefined,
      };
  }
}

export async function getPlanSummaryForUser(userId: string): Promise<PlanSummary> {
  const entitlements = await getAccountEntitlements(userId);
  const agencyEnt = entitlements.find((e) => e.planId === PLAN_IDS.agency2999);

  // Apply period reset in-place instead of a second full entitlements query.
  let list = entitlements;
  if (agencyEnt) {
    const refreshedAgency = await ensurePeriodReset(agencyEnt.id);
    if (refreshedAgency) {
      list = entitlements.map((e) =>
        e.id === refreshedAgency.id
          ? {
              ...e,
              auditsUsedPeriod: refreshedAgency.auditsUsedPeriod,
              periodResetAt: refreshedAgency.periodResetAt,
            }
          : e
      );
    }
  }

  const primary = pickPrimaryEntitlement(list);
  const primaryPlanId = (primary?.planId as PlanId) ?? PLAN_IDS.free;
  const domain =
    primary?.site?.canonicalDomain ??
    (primary?.boundUrl ? canonicalizeDomain(primary.boundUrl) : null);

  const card = primary
    ? entitlementCardCopy(primary)
    : { entitlementLabel: "Free scan available" };

  const freeEntitlement = list.find((e) => e.planId === PLAN_IDS.free);

  return {
    primaryPlanId,
    planBadge: formatPlanBadge(primaryPlanId, domain),
    entitlementLabel: card.entitlementLabel,
    entitlementAction: card.entitlementAction,
    domain,
    freeScansUsed: freeEntitlement?.freeScansUsed ?? 0,
    freeScanAvailable: (freeEntitlement?.freeScansUsed ?? 0) === 0,
    rescansRemaining: primary?.rescansRemaining ?? 0,
    rescansExpiresAt: primary?.rescansExpiresAt ?? null,
    auditsUsedPeriod: primary?.auditsUsedPeriod ?? 0,
    auditsLimit: primary?.auditsLimit ?? null,
    periodResetAt: primary?.periodResetAt ?? null,
  };
}

export async function resolveAuditTypeForScan(input: {
  userId: string;
  url: string;
}): Promise<{ auditType: AuditType; planId: PlanId }> {
  const domain = canonicalizeDomain(input.url);
  const entitlements = await getAccountEntitlements(input.userId);

  const siteEntitlement = entitlements.find(
    (e) =>
      e.site?.canonicalDomain === domain ||
      (e.boundUrl ? canonicalizeDomain(e.boundUrl) === domain : false)
  );

  if (siteEntitlement) {
    return {
      auditType: planToAuditType(siteEntitlement.planId as PlanId),
      planId: siteEntitlement.planId as PlanId,
    };
  }

  const agency = entitlements.find((e) => e.planId === PLAN_IDS.agency2999);
  if (agency) {
    return { auditType: "standard", planId: PLAN_IDS.agency2999 };
  }

  const free = entitlements.find((e) => e.planId === PLAN_IDS.free);
  if (free && free.freeScansUsed === 0) {
    return { auditType: "quick", planId: PLAN_IDS.free };
  }

  return { auditType: "quick", planId: PLAN_IDS.free };
}

export async function consumeFreeScan(userId: string) {
  const free = await ensureFreeEntitlement(userId);
  if (free.freeScansUsed > 0) return free;

  return db.entitlement.update({
    where: { id: free.id },
    data: { freeScansUsed: 1 },
  });
}

export async function setDevEntitlement(input: {
  userId: string;
  planId: PlanId;
  domain?: string;
  rescansRemaining?: number;
  rescansExpiresAt?: Date;
  purchasedAt?: Date;
  amountInr?: number;
}) {
  await ensureFreeEntitlement(input.userId);

  if (input.planId === PLAN_IDS.free) {
    await db.entitlement.updateMany({
      where: { userId: input.userId, planId: { not: PLAN_IDS.free } },
      data: { status: "inactive" },
    });
    return ensureFreeEntitlement(input.userId);
  }

  let siteId: string | null = null;
  let boundUrl: string | null = null;

  if (input.domain) {
    const site = await db.site.upsert({
      where: {
        userId_canonicalDomain: {
          userId: input.userId,
          canonicalDomain: canonicalizeDomain(input.domain),
        },
      },
      create: {
        userId: input.userId,
        canonicalDomain: canonicalizeDomain(input.domain),
      },
      update: {},
    });
    siteId = site.id;
    boundUrl = `https://${canonicalizeDomain(input.domain)}`;

    await db.entitlement.updateMany({
      where: {
        userId: input.userId,
        planId: input.planId,
        siteId,
      },
      data: { status: "inactive" },
    });
  }

  return db.entitlement.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      siteId,
      boundUrl,
      status: "active",
      purchasedAt: input.purchasedAt ?? null,
      amountInr: input.amountInr ?? null,
      rescansRemaining:
        input.planId === PLAN_IDS.deep999 ? (input.rescansRemaining ?? 1) : 0,
      rescansExpiresAt:
        input.planId === PLAN_IDS.deep999 ? (input.rescansExpiresAt ?? null) : null,
      auditsLimit: input.planId === PLAN_IDS.agency2999 ? 30 : null,
      auditsUsedPeriod: 0,
      periodResetAt:
        input.planId === PLAN_IDS.agency2999
          ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          : null,
    },
  });
}

export type AuditOption = {
  id: ProductChoice;
  title: string;
  description: string;
  planId: PlanId;
  auditType: AuditType;
  priceInr?: number;
  available: boolean;
  requiresPurchase?: boolean;
  bindsOnStart?: boolean;
  action: "start" | "purchase" | "reopen";
};

function isPaidPlanId(planId: string) {
  return planId === PLAN_IDS.oneSite499 || planId === PLAN_IDS.deep999;
}

function isUnboundEntitlement(
  e: Awaited<ReturnType<typeof getAccountEntitlements>>[number]
) {
  return isPaidPlanId(e.planId) && !e.siteId && !e.boundUrl;
}

export async function getUnboundEntitlements(userId: string, planId?: PlanId) {
  const entitlements = await getAccountEntitlements(userId);
  return entitlements
    .filter((e) => isUnboundEntitlement(e) && (!planId || e.planId === planId))
    .sort((a, b) => {
      const aTime = a.purchasedAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.purchasedAt?.getTime() ?? b.createdAt.getTime();
      return aTime - bTime;
    });
}

export async function bindEntitlementToUrl(input: {
  entitlementId: string;
  userId: string;
  url: string;
}) {
  const entitlement = await db.entitlement.findFirst({
    where: { id: input.entitlementId, userId: input.userId, status: "active" },
  });
  if (!entitlement) throw new Error("Entitlement not found");

  const domain = canonicalizeDomain(input.url);

  if (entitlement.siteId || entitlement.boundUrl) {
    const existingDomain = entitlement.boundUrl
      ? canonicalizeDomain(entitlement.boundUrl)
      : null;
    if (existingDomain && existingDomain !== domain) {
      throw new Error("Entitlement is already bound to a different URL");
    }
    return entitlement;
  }

  const site = await db.site.upsert({
    where: {
      userId_canonicalDomain: {
        userId: input.userId,
        canonicalDomain: domain,
      },
    },
    create: {
      userId: input.userId,
      canonicalDomain: domain,
    },
    update: {},
  });

  return db.entitlement.update({
    where: { id: entitlement.id },
    data: {
      siteId: site.id,
      boundUrl: `https://${domain}`,
    },
  });
}

function getBoundDomain(
  e: Awaited<ReturnType<typeof getAccountEntitlements>>[number]
) {
  return (
    e.site?.canonicalDomain ??
    (e.boundUrl ? canonicalizeDomain(e.boundUrl) : null)
  );
}

function findBoundEntitlementForOtherDomain(
  entitlements: Awaited<ReturnType<typeof getAccountEntitlements>>,
  domain: string
) {
  return entitlements.find((e) => {
    const bound = getBoundDomain(e);
    return isPaidPlanId(e.planId) && bound !== null && bound !== domain;
  });
}

export async function getSiteEntitlementForDomain(input: {
  userId: string;
  domain: string;
}) {
  const entitlements = await getAccountEntitlements(input.userId);
  const domain = canonicalizeDomain(input.domain);

  return entitlements.find(
    (e) =>
      (e.planId === PLAN_IDS.oneSite499 || e.planId === PLAN_IDS.deep999) &&
      (e.site?.canonicalDomain === domain ||
        (e.boundUrl ? canonicalizeDomain(e.boundUrl) === domain : false))
  );
}

export async function getEntitlementForMission(missionId: string) {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { userId: true, domain: true, auditType: true, siteId: true },
  });
  if (!mission?.userId) return null;

  const domain = canonicalizeDomain(mission.domain);
  const siteEnt = await getSiteEntitlementForDomain({
    userId: mission.userId,
    domain,
  });

  if (siteEnt) {
    return { planId: siteEnt.planId as PlanId, auditType: mission.auditType as AuditType };
  }

  // Early-access approved users unlock Full Intelligence features without a
  // site-bound purchase (fixes board, full report, competitor intel, nav).
  if (await isUserApproved(mission.userId)) {
    if (mission.auditType === "quick") {
      return { planId: PLAN_IDS.free as PlanId, auditType: "quick" as AuditType };
    }
    return {
      planId: PLAN_IDS.deep999 as PlanId,
      auditType: mission.auditType as AuditType,
    };
  }

  if (mission.auditType === "quick") {
    return { planId: PLAN_IDS.free as PlanId, auditType: "quick" as AuditType };
  }

  return { planId: PLAN_IDS.free as PlanId, auditType: mission.auditType as AuditType };
}

export async function getAvailableAuditOptions(input: {
  userId: string;
  url: string;
}): Promise<AuditOption[]> {
  const earlyAccessApproved = await isUserApproved(input.userId);

  // No payments yet: approved early-access users get Full Intelligence (and re-scan) free.
  if (earlyAccessApproved) {
    return [
      {
        id: "deep_audit",
        title: "Full Intelligence",
        description: "Deep audit + competitor comparison — early access",
        planId: PLAN_IDS.deep999,
        auditType: "deep",
        available: true,
        action: "start",
      },
      {
        id: "rescan",
        title: "Verification Re-scan",
        description: "Confirm fixes worked — early access",
        planId: PLAN_IDS.deep999,
        auditType: "rescan",
        available: true,
        action: "start",
      },
    ];
  }

  const domain = canonicalizeDomain(input.url);
  const entitlements = await getAccountEntitlements(input.userId);
  const free = entitlements.find((e) => e.planId === PLAN_IDS.free);
  const siteEnt = entitlements.find(
    (e) =>
      (e.planId === PLAN_IDS.oneSite499 || e.planId === PLAN_IDS.deep999) &&
      (e.site?.canonicalDomain === domain ||
        (e.boundUrl ? canonicalizeDomain(e.boundUrl) === domain : false))
  );

  const options: AuditOption[] = [];

  if (!siteEnt && free && free.freeScansUsed === 0) {
    options.push({
      id: "free_quick",
      title: "Quick Scan",
      description: "Free preview — score and top 2 ghost spots",
      planId: PLAN_IDS.free,
      auditType: "quick",
      priceInr: 0,
      available: true,
      action: "start",
    });
  }

  const unbound499 = await getUnboundEntitlements(input.userId, PLAN_IDS.oneSite499);
  const unbound999 = await getUnboundEntitlements(input.userId, PLAN_IDS.deep999);

  if (siteEnt?.planId === PLAN_IDS.oneSite499) {
    options.push({
      id: "standard_audit",
      title: "Standard Audit",
      description: "Run another Standard audit for your owned URL",
      planId: PLAN_IDS.oneSite499,
      auditType: "standard",
      available: true,
      action: "start",
    });
    options.push({
      id: "deep_purchase",
      title: "Upgrade to Full Intelligence",
      description: "Deep audit + competitor comparison + re-scan",
      planId: PLAN_IDS.deep999,
      auditType: "deep",
      priceInr: PRODUCT_PRICES_INR[PLAN_IDS.deep999],
      available: true,
      requiresPurchase: true,
      action: "purchase",
    });
  } else if (unbound499.length > 0 && !siteEnt) {
    options.push({
      id: "standard_audit",
      title: "Fix My Site",
      description: "Use your Fix My Site purchase — locks permanently to this URL",
      planId: PLAN_IDS.oneSite499,
      auditType: "standard",
      available: true,
      bindsOnStart: true,
      action: "start",
    });
  }

  if (siteEnt?.planId === PLAN_IDS.deep999) {
    options.push({
      id: "deep_audit",
      title: "Deep Audit",
      description: "Full intelligence audit for your owned URL",
      planId: PLAN_IDS.deep999,
      auditType: "deep",
      available: true,
      action: "start",
    });
    if (
      siteEnt.rescansRemaining > 0 &&
      siteEnt.rescansExpiresAt &&
      siteEnt.rescansExpiresAt > new Date()
    ) {
      options.push({
        id: "rescan",
        title: "Verification Re-scan",
        description: `Confirm fixes worked — expires ${formatRescanExpiry(siteEnt.rescansExpiresAt)}`,
        planId: PLAN_IDS.deep999,
        auditType: "rescan",
        available: true,
        action: "start",
      });
    }
  } else if (unbound999.length > 0 && !siteEnt) {
    options.push({
      id: "deep_audit",
      title: "Full Intelligence",
      description: "Use your Full Intelligence purchase — locks permanently to this URL",
      planId: PLAN_IDS.deep999,
      auditType: "deep",
      available: true,
      bindsOnStart: true,
      action: "start",
    });
  }

  const hasStandardAccess = siteEnt?.planId === PLAN_IDS.oneSite499 || unbound499.length > 0;
  const hasDeepAccess = siteEnt?.planId === PLAN_IDS.deep999 || unbound999.length > 0;

  if (!hasStandardAccess && !siteEnt) {
    options.push({
      id: "standard_purchase",
      title: "Fix My Site",
      description: "Standard audit with Growth Kit and PDF — one URL forever",
      planId: PLAN_IDS.oneSite499,
      auditType: "standard",
      priceInr: PRODUCT_PRICES_INR[PLAN_IDS.oneSite499],
      available: true,
      requiresPurchase: true,
      action: "purchase",
    });
  }

  if (!hasDeepAccess && siteEnt?.planId !== PLAN_IDS.deep999) {
    options.push({
      id: "deep_purchase",
      title: "Full Intelligence",
      description: "Deep audit, competitor intel, and 1 re-scan within 60 days",
      planId: PLAN_IDS.deep999,
      auditType: "deep",
      priceInr: PRODUCT_PRICES_INR[PLAN_IDS.deep999],
      available: true,
      requiresPurchase: true,
      action: "purchase",
    });
  }

  const agencyEnt = entitlements.find((e) => e.planId === PLAN_IDS.agency2999);
  if (agencyEnt && !siteEnt) {
    const quota = await getAgencyQuotaStatus(input.userId);
    if (quota && !quota.exhausted) {
      options.push({
        id: "agency_standard",
        title: "Standard Client Audit",
        description: `Uses 1 of ${quota.remaining} remaining monthly audits`,
        planId: PLAN_IDS.agency2999,
        auditType: "standard",
        available: true,
        action: "start",
      });
      options.push({
        id: "agency_deep",
        title: "Deep Client Audit",
        description: `Full intelligence — uses 1 of ${quota.remaining} remaining monthly audits`,
        planId: PLAN_IDS.agency2999,
        auditType: "deep",
        available: true,
        action: "start",
      });
    }
  }

  return options;
}

export type ScanValidationResult =
  | {
      ok: true;
      auditType: AuditType;
      planId: PlanId;
      consumeFree?: boolean;
      consumeRescan?: boolean;
      consumeAgency?: boolean;
      entitlementIdToBind?: string;
    }
  | { ok: false; error: string };

export async function validateScanEntitlement(input: {
  userId: string;
  url: string;
  productChoice?: ProductChoice;
  auditType?: AuditType;
  authorized?: boolean;
  bindConfirmed?: boolean;
}): Promise<ScanValidationResult> {
  if (!input.authorized) {
    return { ok: false, error: "Please confirm you are authorized to audit this website." };
  }

  const earlyAccessApproved = await isUserApproved(input.userId);
  if (earlyAccessApproved) {
    const choice = input.productChoice;
    if (choice === "standard_purchase" || choice === "deep_purchase") {
      return { ok: false, error: "Complete purchase before starting this audit." };
    }
    if (choice === "rescan") {
      return {
        ok: true,
        auditType: "rescan",
        planId: PLAN_IDS.deep999,
        consumeRescan: false,
      };
    }
    if (choice === "standard_audit" || choice === "agency_standard") {
      return { ok: true, auditType: "standard", planId: PLAN_IDS.deep999 };
    }
    if (choice === "free_quick") {
      return { ok: true, auditType: "quick", planId: PLAN_IDS.free, consumeFree: false };
    }
    // deep_audit, agency_deep, or unspecified → full intelligence.
    // If they already bought deep_999 and haven't bound it, bind on start.
    const unboundDeep = (await getUnboundEntitlements(input.userId, PLAN_IDS.deep999))[0];
    return {
      ok: true,
      auditType: "deep",
      planId: PLAN_IDS.deep999,
      entitlementIdToBind: unboundDeep?.id,
    };
  }

  const domain = canonicalizeDomain(input.url);
  const entitlements = await getAccountEntitlements(input.userId);
  const free = entitlements.find((e) => e.planId === PLAN_IDS.free);
  const siteEnt = entitlements.find(
    (e) =>
      (e.planId === PLAN_IDS.oneSite499 || e.planId === PLAN_IDS.deep999) &&
      (e.site?.canonicalDomain === domain ||
        (e.boundUrl ? canonicalizeDomain(e.boundUrl) === domain : false))
  );

  const choice = input.productChoice;

  const agencyEnt = entitlements.find((e) => e.planId === PLAN_IDS.agency2999);

  if (choice === "agency_standard" || choice === "agency_deep") {
    if (!agencyEnt) {
      return { ok: false, error: "Agency subscription required for client audits." };
    }
    const quota = await getAgencyQuotaStatus(input.userId);
    if (!quota || quota.exhausted) {
      const resetLabel = quota?.periodResetAt
        ? formatRescanExpiry(quota.periodResetAt)
        : "next month";
      return {
        ok: false,
        error: `30 of 30 Standard audits used. Your quota resets on ${resetLabel}.`,
      };
    }
    return {
      ok: true,
      auditType: choice === "agency_deep" ? "deep" : "standard",
      planId: PLAN_IDS.agency2999,
      consumeAgency: true,
    };
  }

  if (choice === "free_quick" || (!choice && !siteEnt && !agencyEnt)) {
    if (siteEnt) {
      return { ok: false, error: "This URL requires a purchased audit for your owned domain." };
    }
    if (!free || free.freeScansUsed > 0) {
      return { ok: false, error: "Your free scan has already been used. Choose a paid audit." };
    }
    return { ok: true, auditType: "quick", planId: PLAN_IDS.free, consumeFree: true };
  }

  if (choice === "rescan") {
    if (!siteEnt || siteEnt.planId !== PLAN_IDS.deep999) {
      return { ok: false, error: "Re-scan is not available for this URL." };
    }
    if (siteEnt.rescansRemaining <= 0 || !siteEnt.rescansExpiresAt || siteEnt.rescansExpiresAt < new Date()) {
      return { ok: false, error: "Your re-scan entitlement has expired or been used." };
    }
    return { ok: true, auditType: "rescan", planId: PLAN_IDS.deep999, consumeRescan: true };
  }

  if (choice === "standard_purchase" || choice === "deep_purchase") {
    return { ok: false, error: "Complete purchase before starting this audit." };
  }

  if (choice === "standard_audit" || choice === "deep_audit") {
    const requiredPlan =
      choice === "deep_audit" ? PLAN_IDS.deep999 : PLAN_IDS.oneSite499;
    const auditType = choice === "deep_audit" ? "deep" : "standard";

    if (siteEnt) {
      if (choice === "standard_audit" && siteEnt.planId === PLAN_IDS.oneSite499) {
        return { ok: true, auditType, planId: PLAN_IDS.oneSite499 };
      }
      if (choice === "deep_audit" && siteEnt.planId === PLAN_IDS.deep999) {
        return { ok: true, auditType, planId: PLAN_IDS.deep999 };
      }
    }

    const unbound = await getUnboundEntitlements(input.userId, requiredPlan);
    if (unbound.length > 0) {
      if (!input.bindConfirmed) {
        return {
          ok: false,
          error: "Please confirm this purchase will permanently apply to this URL.",
        };
      }
      return {
        ok: true,
        auditType,
        planId: requiredPlan,
        entitlementIdToBind: unbound[0].id,
      };
    }

    const boundElsewhere = findBoundEntitlementForOtherDomain(entitlements, domain);
    if (boundElsewhere) {
      const otherDomain =
        boundElsewhere.site?.canonicalDomain ??
        (boundElsewhere.boundUrl ? canonicalizeDomain(boundElsewhere.boundUrl) : null);
      return {
        ok: false,
        error: otherDomain
          ? `This purchase is bound to ${otherDomain}. Start an audit for that URL or buy a new report.`
          : "This purchase is bound to a different URL. Start an audit for the owned domain.",
      };
    }

    return {
      ok: false,
      error: "No entitlement available for this audit. Choose a plan or use your free scan.",
    };
  }

  if (siteEnt) {
    const boundDomain =
      siteEnt.site?.canonicalDomain ??
      (siteEnt.boundUrl ? canonicalizeDomain(siteEnt.boundUrl) : null);
    if (boundDomain && boundDomain !== domain) {
      return {
        ok: false,
        error: "This purchase is bound to a different URL. Start an audit for the owned domain.",
      };
    }
    const auditType =
      input.auditType ?? planToAuditType(siteEnt.planId as PlanId);
    return { ok: true, auditType, planId: siteEnt.planId as PlanId };
  }

  if (agencyEnt) {
    const quota = await getAgencyQuotaStatus(input.userId);
    if (quota && !quota.exhausted) {
      return {
        ok: true,
        auditType: input.auditType ?? "standard",
        planId: PLAN_IDS.agency2999,
        consumeAgency: true,
      };
    }
    const resetLabel = quota?.periodResetAt
      ? formatRescanExpiry(quota.periodResetAt)
      : "next month";
    return {
      ok: false,
      error: `30 of 30 Standard audits used. Your quota resets on ${resetLabel}.`,
    };
  }

  return { ok: false, error: "No entitlement available for this audit. Choose a plan or use your free scan." };
}

export async function consumeRescan(userId: string, domain: string) {
  const ent = await getSiteEntitlementForDomain({ userId, domain });
  if (!ent || ent.rescansRemaining <= 0) return;
  await db.entitlement.update({
    where: { id: ent.id },
    data: { rescansRemaining: { decrement: 1 } },
  });
}

/** Starts the 60-day re-scan window on first deep audit (not at purchase). */
export async function activateRescanWindowOnDeepAudit(input: {
  userId: string;
  domain: string;
}) {
  const ent = await getSiteEntitlementForDomain({
    userId: input.userId,
    domain: input.domain,
  });
  if (!ent || ent.planId !== PLAN_IDS.deep999) return;
  if (ent.rescansRemaining <= 0 || ent.rescansExpiresAt) return;

  await db.entitlement.update({
    where: { id: ent.id },
    data: { rescansExpiresAt: rescanWindowExpiresFrom() },
  });
}

export async function simulateAgencySubscription(userId: string) {
  await getOrCreateWorkspace(userId);

  await db.entitlement.updateMany({
    where: {
      userId,
      planId: { not: PLAN_IDS.free },
    },
    data: { status: "inactive" },
  });

  const existing = await db.entitlement.findFirst({
    where: { userId, planId: PLAN_IDS.agency2999, status: "active" },
  });

  const periodResetAt = new Date();
  periodResetAt.setDate(periodResetAt.getDate() + 30);

  if (existing) {
    return db.entitlement.update({
      where: { id: existing.id },
      data: {
        auditsLimit: AGENCY_MONTHLY_AUDIT_LIMIT,
        auditsUsedPeriod: 0,
        periodResetAt,
        purchasedAt: new Date(),
        amountInr: PRODUCT_PRICES_INR[PLAN_IDS.agency2999] ?? 2999,
      },
    });
  }

  return db.entitlement.create({
    data: {
      userId,
      planId: PLAN_IDS.agency2999,
      status: "active",
      auditsLimit: AGENCY_MONTHLY_AUDIT_LIMIT,
      auditsUsedPeriod: 0,
      periodResetAt,
      purchasedAt: new Date(),
      amountInr: PRODUCT_PRICES_INR[PLAN_IDS.agency2999] ?? 2999,
    },
  });
}

export async function simulatePurchase(input: {
  userId: string;
  planId: PlanId;
  domain?: string;
}) {
  if (input.planId !== PLAN_IDS.oneSite499 && input.planId !== PLAN_IDS.deep999) {
    throw new Error("Only one-time purchases can be simulated");
  }

  const amountInr = PRODUCT_PRICES_INR[input.planId] ?? 0;

  return setDevEntitlement({
    userId: input.userId,
    planId: input.planId,
    domain: input.domain,
    purchasedAt: new Date(),
    amountInr,
    rescansRemaining: input.planId === PLAN_IDS.deep999 ? 1 : 0,
  });
}

export type OwnedPurchaseRow = {
  id: string;
  planId: PlanId;
  planLabel: string;
  domain: string | null;
  isBound: boolean;
  amountInr: number | null;
  purchasedAt: Date | null;
  rescansRemaining: number;
  rescansExpiresAt: Date | null;
  latestMissionId: string | null;
};

export async function getOwnedPurchasesForUser(userId: string): Promise<OwnedPurchaseRow[]> {
  const entitlements = await getAccountEntitlements(userId);
  const paid = entitlements.filter(
    (e) => e.planId === PLAN_IDS.oneSite499 || e.planId === PLAN_IDS.deep999
  );

  const rows: OwnedPurchaseRow[] = [];
  for (const e of paid) {
    const domain =
      e.site?.canonicalDomain ??
      (e.boundUrl ? canonicalizeDomain(e.boundUrl) : null);
    const isBound = domain !== null;
    const latest = isBound
      ? await db.mission.findFirst({
          where: { userId, domain: { contains: domain } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;
    rows.push({
      id: e.id,
      planId: e.planId as PlanId,
      planLabel: e.planId === PLAN_IDS.deep999 ? "Full Intelligence" : "Fix My Site",
      domain,
      isBound,
      amountInr: e.amountInr,
      purchasedAt: e.purchasedAt,
      rescansRemaining: e.rescansRemaining,
      rescansExpiresAt: e.rescansExpiresAt,
      latestMissionId: latest?.id ?? null,
    });
  }
  return rows;
}

export function getProductReviewMeta(planId: PlanId) {
  return PRODUCT_METADATA[planId];
}
