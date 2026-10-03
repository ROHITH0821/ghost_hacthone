import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { unseal, assertOrigin, AnalyticsError } from "@/lib/data-sources/ga4/security";
import { GoogleAnalyticsApi } from "@/lib/data-sources/ga4/google";

/**
 * POST /api/integrations/ga4/disconnect
 *
 * Revokes Google access and removes the DataSourceConnection.
 *
 * Body: { siteId: string }
 */
export async function POST(request: NextRequest) {
  try {
    assertOrigin(request.headers.get("origin"));
  } catch (error) {
    if (error instanceof AnalyticsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { siteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { siteId } = body;
  if (!siteId || typeof siteId !== "string") {
    return NextResponse.json({ error: "siteId is required." }, { status: 400 });
  }

  // Verify site ownership.
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const site = await db.site.findUnique({ where: { id: siteId }, select: { id: true, userId: true } });
  if (!site || site.userId !== userId) {
    return NextResponse.json({ error: "Site not found or access denied." }, { status: 403 });
  }

  // Find the connection.
  const connection = await db.dataSourceConnection.findUnique({
    where: { siteId_provider: { siteId, provider: "ga4" } },
  });

  if (!connection) {
    return NextResponse.json({ ok: true, message: "No connection found." });
  }

  // Best-effort token revocation.
  try {
    const refreshToken = unseal(connection.refreshToken, siteId);
    const api = new GoogleAnalyticsApi();
    await api.revoke(refreshToken);
  } catch {
    // Revocation failure is non-fatal — we still remove our stored credentials.
  }

  // Delete the connection.
  await db.dataSourceConnection.delete({
    where: { id: connection.id },
  });

  // Clean up any pending OAuth attempts.
  await db.dataSourceOAuth.deleteMany({ where: { siteId, userId } });

  return NextResponse.json({ ok: true });
}
