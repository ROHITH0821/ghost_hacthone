import { NextRequest, NextResponse, after } from "next/server";

import {
  finalizeMission,
  isFinalizeComplete,
} from "@/lib/missions/finalize-mission";

export const runtime = "nodejs";
export const maxDuration = 800;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[finalize] CRON_SECRET is not set");
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

  if (!force && (await isFinalizeComplete(missionId))) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      intelOk: true,
      pdfOk: true,
      emailOk: true,
    });
  }

  if (request.nextUrl.searchParams.get("dispatch") === "1") {
    after(async () => {
      try { await finalizeMission(missionId, { force }); }
      catch { console.error(JSON.stringify({ event: "mission.worker_failed", missionId, phase: "finalize" })); }
    });
    return NextResponse.json({ ok: true, skipped: false, intelOk: false, pdfOk: false, emailOk: false, errors: [] });
  }

  const result = await finalizeMission(missionId, { force });

  return NextResponse.json({
    ok: result.ok,
    skipped: result.skipped,
    intelOk: result.intelOk,
    pdfOk: result.pdfOk,
    emailOk: result.emailOk,
    errors: result.errors,
  });
}
