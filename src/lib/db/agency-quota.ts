import { db } from "@/lib/db";
import { getAgencyEntitlement } from "@/lib/db/agency-workspace";
import { PLAN_IDS } from "@/lib/plans";

export const AGENCY_MONTHLY_AUDIT_LIMIT = 30;

export type AgencyQuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  periodResetAt: Date | null;
  exhausted: boolean;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function ensurePeriodReset(entitlementId: string) {
  const ent = await db.entitlement.findUnique({ where: { id: entitlementId } });
  if (!ent || ent.planId !== PLAN_IDS.agency2999) return ent;

  const now = new Date();
  if (!ent.periodResetAt || ent.periodResetAt <= now) {
    return db.entitlement.update({
      where: { id: entitlementId },
      data: {
        auditsUsedPeriod: 0,
        periodResetAt: addDays(now, 30),
      },
    });
  }
  return ent;
}

export async function getAgencyQuotaStatus(userId: string): Promise<AgencyQuotaStatus | null> {
  const ent = await getAgencyEntitlement(userId);
  if (!ent) return null;

  const refreshed = await ensurePeriodReset(ent.id);
  if (!refreshed) return null;

  const limit = refreshed.auditsLimit ?? AGENCY_MONTHLY_AUDIT_LIMIT;
  const used = refreshed.auditsUsedPeriod;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    periodResetAt: refreshed.periodResetAt,
    exhausted: remaining <= 0,
  };
}

export async function consumeAgencyAudit(userId: string) {
  const ent = await getAgencyEntitlement(userId);
  if (!ent) return;

  await ensurePeriodReset(ent.id);
  await db.entitlement.update({
    where: { id: ent.id },
    data: { auditsUsedPeriod: { increment: 1 } },
  });
}

export async function restoreAgencyAudit(userId: string) {
  const ent = await getAgencyEntitlement(userId);
  if (!ent || ent.auditsUsedPeriod <= 0) return;

  await db.entitlement.update({
    where: { id: ent.id },
    data: { auditsUsedPeriod: { decrement: 1 } },
  });
}
