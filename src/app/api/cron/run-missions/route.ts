import { dispatchMission } from "@/lib/missions/dispatch";
import { NextRequest, NextResponse } from "next/server";

import { RUN_CRON_LIMIT } from "@/lib/missions/run-config";
import {
  findMissionsNeedingRun,
} from "@/lib/missions/run-audit-mission";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/run-missions] CRON_SECRET is not set");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : RUN_CRON_LIMIT;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 10) : RUN_CRON_LIMIT;

  const missionIds = await findMissionsNeedingRun(safeLimit);
  const results = await Promise.all(missionIds.map(async (missionId) => {
    const result = await dispatchMission(missionId, "run");
    return { missionId, ok: result.ok, skipped: false, errors: result.errors };
  }));

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
