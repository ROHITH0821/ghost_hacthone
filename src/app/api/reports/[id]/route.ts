import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertMissionAccess, MissionAccessError } from "@/lib/auth/mission-access";
import { copy } from "@/lib/copy";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { loadReportPayload } from "@/lib/report/load-report-payload";
import { PRIVATE_REPORT } from "@/lib/http/cache-headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: copy.authApi.authRequired },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    await assertMissionAccess(id, userId);
  } catch (error) {
    if (error instanceof MissionAccessError) {
      return NextResponse.json(
        { error: copy.authApi.reportNotFound },
        { status: error.code === "forbidden" ? 403 : 404 }
      );
    }
    throw error;
  }

  const payload = await loadReportPayload(id);

  if (!payload) {
    return NextResponse.json(
      { error: copy.authApi.reportNotFound },
      { status: 404 }
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": PRIVATE_REPORT },
  });
}
