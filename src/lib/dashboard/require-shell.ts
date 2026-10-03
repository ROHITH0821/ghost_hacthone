import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardShellData } from "@/lib/db/dashboard-shell";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { copy } from "@/lib/copy";

/**
 * Auth for dashboard data APIs — no DB shell (plan/nav/agency).
 * Resolves JWT userId to the DB row (email fallback for legacy tokens).
 * Layout still uses requireDashboardShell for chrome.
 */
export async function requireDashboardUser() {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    } as const;
  }
  if (session.accessStatus !== "approved") {
    return {
      error: NextResponse.json({ error: copy.earlyAccess.body }, { status: 403 }),
    } as const;
  }
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  return {
    userId,
    email: session.email,
  } as const;
}

export async function requireDashboardShell() {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    } as const;
  }
  const shell = await getDashboardShellData(session.userId, session.email);
  return { shell } as const;
}
