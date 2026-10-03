import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { fixesFiltersToQuery, parseFixesFilters } from "@/lib/dashboard/filters";
import { getAccountEntitlements } from "@/lib/db/entitlements";
import { getFixesForUser } from "@/lib/db/fix-status";
import { getSitesForUser } from "@/lib/db/sites";
import { isUserApproved } from "@/lib/db/users";
import { isPaidPlan, PLAN_IDS, type PlanId } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFixesFilters(params);
  const query = fixesFiltersToQuery(filters);

  const [fixes, sites, entitlements, approved] = await Promise.all([
    getFixesForUser({ userId, ...query }),
    getSitesForUser(userId),
    getAccountEntitlements(userId),
    isUserApproved(userId),
  ]);

  const hasPaidAccess =
    approved ||
    entitlements.some(
      (e) => isPaidPlan(e.planId as PlanId) && e.planId !== PLAN_IDS.agency2999
    ) ||
    entitlements.some((e) => e.planId === PLAN_IDS.agency2999);

  return NextResponse.json({
    fixes,
    sites: sites.map((s) => ({ id: s.id, domain: s.canonicalDomain })),
    hasPaidAccess,
  });
}
