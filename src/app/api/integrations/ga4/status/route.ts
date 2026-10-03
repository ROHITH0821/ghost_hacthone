import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { normalizeWebsiteInput } from "@/lib/website-input";
import { canonicalizeDomain } from "@/lib/db/sites";
import { configured } from "@/lib/data-sources/ga4/security";

/**
 * GET /api/integrations/ga4/status?siteId=xxx
 *
 * Returns the GA4 connection status for a site.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.accessStatus !== "approved") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  const website = normalizeWebsiteInput(request.nextUrl.searchParams.get("url") ?? "");
  if (!siteId && !website) {
    return NextResponse.json({ error: "A website or siteId is required." }, { status: 400 });
  }
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const site = await db.site.findFirst({
    where: { userId, ...(siteId ? { id: siteId } : { canonicalDomain: canonicalizeDomain(website!) }) },
    select: { id: true },
  });
  if (!site) {
    if (siteId) return NextResponse.json({ error: "Site not found or access denied." }, { status: 403 });
    return NextResponse.json({ configured: configured(), connected: false, connection: null, siteId: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  // Check if GA4 integration is configured on this Ghost installation.
  const ga4Configured = configured();

  // Find the connection.
  const connection = await db.dataSourceConnection.findUnique({
    where: { siteId_provider: { siteId: site.id, provider: "ga4" } },
    select: {
      id: true,
      propertyId: true,
      propertyName: true,
      streamId: true,
      hostname: true,
      timeZone: true,
      status: true,
      lastError: true,
      lastSyncedAt: true,
      lastAttemptAt: true,
      nextSyncAt: true,
    },
  });

  if (!connection) {
    return NextResponse.json({
      siteId: site.id,
      configured: ga4Configured,
      connected: false,
      connection: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  return NextResponse.json({
    siteId: site.id,
    configured: ga4Configured,
    connected: connection.status !== "disconnected",
    connection: {
      id: connection.id,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
      streamId: connection.streamId,
      hostname: connection.hostname,
      timeZone: connection.timeZone,
      status: connection.status,
      lastError: connection.lastError,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      lastAttemptAt: connection.lastAttemptAt?.toISOString() ?? null,
      nextSyncAt: connection.nextSyncAt?.toISOString() ?? null,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
