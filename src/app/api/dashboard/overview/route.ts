import { NextResponse } from "next/server";
import { getRunningMissionsForAgency } from "@/lib/db/clients";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { getFixCountsForUser } from "@/lib/db/fix-status";
import { getOverviewMissionsForUser } from "@/lib/db/missions";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;
  const [missions, fixCounts, agency] = await Promise.all([
    getOverviewMissionsForUser({ userId, limit: 5 }),
    getFixCountsForUser(userId),
    isAgencyUser(userId),
  ]);

  const runningQueue = agency ? await getRunningMissionsForAgency(userId) : [];

  return NextResponse.json({
    missions,
    fixCounts,
    runningQueue: runningQueue.map((m) => ({
      id: m.id,
      domain: m.domain,
      clientName: m.client?.name ?? null,
      clientDomain: m.client?.primaryDomain ?? null,
    })),
  });
}
