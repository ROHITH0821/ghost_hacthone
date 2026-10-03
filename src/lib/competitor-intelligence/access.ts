import type { PlanId } from "@/lib/plans";
import { PLAN_IDS } from "@/lib/plans";

/** Full Intelligence (deep999) audits include competitor market intelligence. */
export function hasCompetitorIntelligenceAccess(input: {
  planId: PlanId | string;
  auditType: string;
}): boolean {
  return (
    input.planId === PLAN_IDS.deep999 &&
    input.auditType !== "quick" &&
    input.auditType !== "rescan"
  );
}
