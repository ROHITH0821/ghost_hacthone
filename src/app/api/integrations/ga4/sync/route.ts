import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { assertOrigin, AnalyticsError, safeError } from "@/lib/data-sources/ga4/security";
import { syncConnection } from "@/lib/data-sources/ga4/sync";

/**
 * POST /api/integrations/ga4/sync
 *
 * Manually triggers a GA4 data sync for a site.
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
    select: { id: true, status: true },
  });

  if (!connection || connection.status === "disconnected") {
    return NextResponse.json(
      { error: "No GA4 connection found for this site." },
      { status: 404 },
    );
  }

  try {
    const snapshot = await syncConnection(connection.id);
    return NextResponse.json({
      ok: true,
      syncedAt: snapshot.syncedAt,
      period: snapshot.period,
      reliable: snapshot.reliable,
      notes: snapshot.notes,
    });
  } catch (error) {
    const analyticsError = safeError(error);
    return NextResponse.json({ error: analyticsError.message }, { status: analyticsError.status });
  }
}
