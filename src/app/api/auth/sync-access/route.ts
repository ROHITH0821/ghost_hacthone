import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSessionToken, applySessionCookie } from "@/lib/auth/session";
import { getUserAccessStatus } from "@/lib/db/users";
import { copy } from "@/lib/copy";

/**
 * Re-issue the session cookie from the latest DB accessStatus
 * (after you flip approved in Supabase).
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: copy.authApi.authRequired },
      { status: 401 }
    );
  }

  try {
    const accessStatus = await getUserAccessStatus(session.userId);
    const token = await createSessionToken({
      userId: session.userId,
      email: session.email,
      accessStatus,
    });

    const response = NextResponse.json({
      success: true,
      accessStatus,
      user: {
        id: session.userId,
        email: session.email,
        accessStatus,
      },
    });
    return applySessionCookie(response, token);
  } catch (error) {
    console.error("[auth/sync-access]", error);
    return NextResponse.json(
      { success: false, message: copy.authApi.somethingWrong },
      { status: 500 }
    );
  }
}
