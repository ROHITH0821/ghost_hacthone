import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { config, digest, safeError, seal } from "@/lib/data-sources/ga4/security";
import { GoogleAnalyticsApi } from "@/lib/data-sources/ga4/google";
import { auditOAuthCompletion } from "@/lib/data-sources/ga4/oauth-response";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const origin = config().origin;
  const cookieName = state ? `ga4_flow_${digest(state)}` : "";
  const flow = cookieName ? request.cookies.get(cookieName)?.value : undefined;
  let siteId = "";

  function finish(error?: string) {
    let response: NextResponse;
    if (flow === "audit") {
      const nonce = randomBytes(16).toString("base64");
      response = new NextResponse(auditOAuthCompletion({ siteId, ...(error ? { error } : {}) }, origin, nonce), {
        headers: {
          "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
        },
      });
    } else {
      const url = new URL("/dashboard/sites", origin);
      url.searchParams.set(error ? "ga4_error" : "ga4_select", error || siteId);
      response = NextResponse.redirect(url);
    }
    if (cookieName) response.cookies.set(cookieName, "", { path: "/api/integrations/ga4/callback", maxAge: 0 });
    return response;
  }

  try {
    const session = await getSession();
    if (!session || session.accessStatus !== "approved" || !state || !flow) return finish("invalid_state");
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    // Select this exact user's attempt, never the most recent global attempt.
    const attempt = await db.dataSourceOAuth.findFirst({
      where: { stateHash: digest(state), userId, phase: "pending", expiresAt: { gt: new Date() }, site: { userId } },
    });
    if (!attempt) return finish("invalid_state");
    siteId = attempt.siteId;
    const claimed = await db.dataSourceOAuth.updateMany({
      where: { id: attempt.id, phase: "pending", expiresAt: { gt: new Date() } },
      data: { phase: "exchanging" },
    });
    if (claimed.count !== 1) return finish("invalid_state");
    if (request.nextUrl.searchParams.has("error") || !code) return finish("denied");
    const { refreshToken } = await new GoogleAnalyticsApi().exchange(code, attempt.verifier);
    if (!refreshToken) return finish("no_refresh_token");
    await db.dataSourceOAuth.update({ where: { id: attempt.id }, data: { refreshToken: seal(refreshToken, attempt.id), phase: "authenticated" } });
    return finish();
  } catch (error) { return finish(safeError(error).code); }
}
