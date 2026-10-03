import { NextRequest, NextResponse, after } from "next/server";

import {
  isAuditRunComplete,
  runAuditMission,
} from "@/lib/missions/run-audit-mission";

export const runtime = "nodejs";
export const maxDuration = 800;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[audit] CRON_SECRET is not set");
    return false;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: missionId } = await params;
  const force = request.nextUrl.searchParams.get("force") === "1";

  if (!force && (await isAuditRunComplete(missionId))) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      errors: [],
    });
  }

  if (request.nextUrl.searchParams.get("dispatch") === "1") {
    after(async () => {
      try { await runAuditMission(missionId, { force }); }
      catch { console.error(JSON.stringify({ event: "mission.worker_failed", missionId, phase: "run" })); }
    });
    return NextResponse.json({ ok: true, skipped: false, errors: [] });
  }

  const result = await runAuditMission(missionId, { force });

  return NextResponse.json({
    ok: result.ok,
    skipped: result.skipped,
    errors: result.errors,
  });
}
