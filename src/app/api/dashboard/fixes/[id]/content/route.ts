import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFixContentForUser } from "@/lib/db/fix-status";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { PRIVATE_REPORT } from "@/lib/http/cache-headers";

/**
 * Full fix content, fetched only when the user copies a fix. List responses
 * carry a truncated preview so the board doesn't ship megabytes of text.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const fixContent = await getFixContentForUser({ userId, fixId: id });

  if (fixContent == null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { fixContent },
    { headers: { "Cache-Control": PRIVATE_REPORT } }
  );
}
