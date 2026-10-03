import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { GoogleAnalyticsApi } from "@/lib/data-sources/ga4/google";
import { safeError, host, unseal } from "@/lib/data-sources/ga4/security";

/**
 * GET /api/integrations/ga4/properties?siteId=xxx
 *
 * Lists available GA4 properties and their web streams for the authenticated
 * Google account (from the most recent OAuth attempt for this site).
 *
 * Each stream is annotated with a `matches` flag indicating whether its
 * hostname matches the site's canonicalDomain. The response also includes
 * `siteDomain` so the frontend can show domain-match indicators.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.accessStatus !== "approved") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required." }, { status: 400 });
  }

  // Verify site ownership and fetch canonicalDomain for domain-matching.
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true, canonicalDomain: true },
  });
  if (!site || site.userId !== userId) {
    return NextResponse.json({ error: "Site not found or access denied." }, { status: 403 });
  }

  const siteDomain = host(site.canonicalDomain);

  // Find the authenticated OAuth attempt.
  const attempt = await db.dataSourceOAuth.findFirst({
    where: {
      siteId,
      userId,
      phase: "authenticated",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!attempt?.refreshToken) {
    return NextResponse.json(
      { error: "No authenticated Google connection found. Please connect Google Analytics first." },
      { status: 404 },
    );
  }

  try {
    const api = new GoogleAnalyticsApi();
    const { accessToken } = await api.refresh(unseal(attempt.refreshToken, attempt.id));

    // List all properties.
    const properties = await api.properties(accessToken);

    // For each property, fetch web data streams and annotate domain match.
    const propertiesWithStreams = await Promise.all(
      properties.map(async (prop) => {
        try {
          const streams = await api.streams(prop.id, accessToken);
          const annotatedStreams = streams.map((s) => ({
            ...s,
            matches: siteDomain !== "" && host(s.url) === siteDomain,
          }));
          return { ...prop, streams: annotatedStreams };
        } catch {
          return { ...prop, streams: [] };
        }
      }),
    );

    // Sort: properties with matching streams first.
    propertiesWithStreams.sort((a, b) => {
      const aMatch = a.streams.some((s) => "matches" in s && s.matches) ? 0 : 1;
      const bMatch = b.streams.some((s) => "matches" in s && s.matches) ? 0 : 1;
      return aMatch - bMatch;
    });

    return NextResponse.json({ properties: propertiesWithStreams, siteDomain });
  } catch (error) {
    const analyticsError = safeError(error);
    return NextResponse.json({ error: analyticsError.message }, { status: analyticsError.status });
  }
}

