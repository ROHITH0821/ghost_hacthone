import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { archiveSiteForUser, unarchiveSiteForUser } from "@/lib/db/sites";
import { resolveUserIdFromSession } from "@/lib/db/users";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action as "archive" | "unarchive";
  const userId = await resolveUserIdFromSession(session.userId, session.email);

  if (action === "archive") {
    await archiveSiteForUser({ userId, siteId: id });
  } else if (action === "unarchive") {
    await unarchiveSiteForUser({ userId, siteId: id });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
