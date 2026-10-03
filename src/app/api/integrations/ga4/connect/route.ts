import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUserIdFromSession } from "@/lib/db/users";
import {
  configured,
  authorizationUrl,
  randomSecret,
  digest,
  assertOrigin,
  AnalyticsError,
} from "@/lib/data-sources/ga4/security";
import { normalizeWebsiteInput } from "@/lib/website-input";
import { upsertSiteForUser } from "@/lib/db/sites";
import { randomBytes } from "node:crypto";

/**
 * POST /api/integrations/ga4/connect
 *
 * Initiates the Google OAuth flow for a site.
 *
 * Body: { siteId?: string, url?: string, returnTo?: "audit" }
 * Returns: { url: string } — the Google authorization URL to redirect the user to.
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

  if (!configured()) {
    return NextResponse.json(
      { error: "Google Analytics is not configured on this Ghost installation yet." },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session || session.accessStatus !== "approved") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { siteId?: string; url?: string; returnTo?: "audit" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  let siteId = typeof body?.siteId === "string" ? body.siteId : null;
  if (!siteId) {
    const url = typeof body?.url === "string" ? normalizeWebsiteInput(body.url) : null;
    if (!url) return NextResponse.json({ error: "A valid website is required." }, { status: 400 });
    // Save only the owner's website, not an audit or entitlement. The audit will reuse this site.
    siteId = (await upsertSiteForUser({ userId, url })).id;
  }
  const site = await db.site.findFirst({ where: { id: siteId, userId }, select: { id: true } });
  if (!site) return NextResponse.json({ error: "Site not found or access denied." }, { status: 403 });

  // Generate OAuth state + PKCE verifier.
  const state = randomSecret();
  const verifier = randomSecret();
  const browserHash = digest(request.headers.get("user-agent") ?? "");
  const id = randomBytes(16).toString("hex");

  // Clean up any expired attempts.
  await db.dataSourceOAuth.deleteMany({
    where: { siteId, expiresAt: { lt: new Date() } },
  });

  // Store the OAuth attempt.
  await db.dataSourceOAuth.create({
    data: {
      id,
      siteId,
      userId,
      stateHash: digest(state),
      browserHash,
      verifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  const url = authorizationUrl(state, verifier);

  const response = NextResponse.json({ url, siteId }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(`ga4_flow_${digest(state)}`, body.returnTo === "audit" ? "audit" : "sites", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/api/integrations/ga4/callback", maxAge: 600,
  });
  return response;
}
