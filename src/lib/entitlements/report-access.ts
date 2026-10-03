import type { GhostReport } from "@/lib/types";
import { PLAN_IDS, isPaidPlan, type PlanId } from "@/lib/plans";

export type ReportViewMode = "free" | "full";

export function getReportViewMode(planId: PlanId, auditType: string): ReportViewMode {
  if (isPaidPlan(planId)) return "full";
  if (auditType !== "quick" && planId !== PLAN_IDS.free) return "full";
  return "free";
}

export function filterReportForViewMode(
  report: GhostReport,
  viewMode: ReportViewMode
): GhostReport {
  if (viewMode === "full") return report;

  return {
    ...report,
    scoreBreakdown: undefined,
    fixes: [],
    leaks: report.leaks.slice(0, 2).map((leak) => ({
      ...leak,
      whyCustomersLeave: "",
      howToFix: "",
      fix: undefined,
    })),
    journey: report.journey.slice(0, 3),
  };
}
