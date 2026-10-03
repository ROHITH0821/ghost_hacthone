import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { GoogleAnalyticsApi } from "@/lib/data-sources/ga4/google";
import { seal, unseal, safeError, assertOrigin, AnalyticsError, host } from "@/lib/data-sources/ga4/security";
import { syncConnection } from "@/lib/data-sources/ga4/sync";

export const maxDuration = 180;

/**
 * POST /api/integrations/ga4/select
 *
 * Saves the selected GA4 property + web stream as the DataSourceConnection
 * for this site. Encrypts the refresh token and triggers the initial sync.
 *
 * Body: { siteId, propertyId, propertyName, streamId, hostname, timeZone }
 *
 * SECURITY: The submitted hostname is validated against the site's
 * canonicalDomain to prevent cross-property data contamination.
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
  if (!session || session.accessStatus !== "approved") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: {
    siteId?: string;
    propertyId?: string;
    propertyName?: string;
    streamId?: string;
    hostname?: string;
    timeZone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { siteId, propertyId, propertyName, streamId, hostname, timeZone } = body;
  if (!siteId || !propertyId || !propertyName || !streamId || !hostname) {
    return NextResponse.json(
      { error: "siteId, propertyId, propertyName, streamId, and hostname are required." },
      { status: 400 },
    );
  }

  // Verify site ownership and fetch canonicalDomain for domain matching.
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true, canonicalDomain: true },
  });
  if (!site || site.userId !== userId) {
    return NextResponse.json({ error: "Site not found or access denied." }, { status: 403 });
  }

  // ── Domain-matching guard ──────────────────────────────────────────
  // Normalize both the submitted hostname and the site's domain, then
  // reject if they don't match. This prevents connecting a GA4 property
  // that belongs to a different website.
  const normalizedHostname = host(hostname);
  const siteDomain = host(site.canonicalDomain);
  if (siteDomain && normalizedHostname !== siteDomain) {
    return NextResponse.json(
      {
        error: `Domain mismatch: the selected property tracks "${normalizedHostname}" but this site is "${siteDomain}". ` +
          "Choose a GA4 property whose web stream matches this website's domain.",
      },
      { status: 403 },
    );
  }

  // Find the authenticated OAuth attempt.
  const attempt = await db.dataSourceOAuth.findFirst({
    where: { siteId, userId, phase: "authenticated", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!attempt?.refreshToken) {
    return NextResponse.json(
      { error: "No authenticated Google connection found. Please connect Google Analytics first." },
      { status: 404 },
    );
  }

  try {
    // Validate that we can access the selected property.
    const api = new GoogleAnalyticsApi();
    const { accessToken } = await api.refresh(unseal(attempt.refreshToken, attempt.id));
    await api.property(propertyId, accessToken);

    // Encrypt the refresh token with the siteId as additional authenticated data.
    const encryptedRefreshToken = seal(unseal(attempt.refreshToken, attempt.id), siteId);

    // Upsert the DataSourceConnection.
    const connection = await db.dataSourceConnection.upsert({
      where: { siteId_provider: { siteId, provider: "ga4" } },
      create: {
        siteId,
        provider: "ga4",
        refreshToken: encryptedRefreshToken,
        propertyId,
        propertyName,
        streamId,
        hostname: normalizedHostname,
        timeZone: timeZone ?? "UTC",
        status: "connected",
        nextSyncAt: new Date(), // sync immediately
      },
      update: {
        refreshToken: encryptedRefreshToken,
        propertyId,
        propertyName,
        streamId,
        hostname: normalizedHostname,
        timeZone: timeZone ?? "UTC",
        status: "connected",
        lastError: null,
        snapshot: Prisma.DbNull,
        lastSyncedAt: null,
        nextSyncAt: new Date(),
      },
    });

    // Clean up the OAuth attempt.
    await db.dataSourceOAuth.update({
      where: { id: attempt.id },
      data: { phase: "complete", refreshToken: null },
    });

    // Finish the first cache fill before returning to the audit form. A failed sync is
    // saved on the connection; the owner can retry or run a website-only audit.
    await syncConnection(connection.id).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      connection: {
        id: connection.id,
        propertyId: connection.propertyId,
        propertyName: connection.propertyName,
        hostname: connection.hostname,
        status: connection.status,
      },
    });
  } catch (error) {
    const analyticsError = safeError(error);
    return NextResponse.json({ error: analyticsError.message }, { status: analyticsError.status });
  }
}

