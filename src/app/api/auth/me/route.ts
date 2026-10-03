import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserAccessStatus,
  normalizeAccessStatus,
  type AccessStatus,
} from "@/lib/db/users";
import { NO_STORE } from "@/lib/http/cache-headers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": NO_STORE } }
    );
  }

  // Fast path: trust the JWT for the common case (landing + chrome).
  // Early-access uses /api/auth/sync-access to refresh from DB after approval.
  let accessStatus: AccessStatus = normalizeAccessStatus(session.accessStatus);

  // Legacy tokens without accessStatus still need a one-time DB lookup.
  if (session.accessStatus == null) {
    try {
      accessStatus = await getUserAccessStatus(session.userId);
    } catch (error) {
      console.error("[auth/me] access status lookup failed:", error);
    }
  }

  return NextResponse.json(
    {
      user: {
        id: session.userId,
        email: session.email,
        accessStatus,
      },
    },
    { headers: { "Cache-Control": NO_STORE } }
  );
}
