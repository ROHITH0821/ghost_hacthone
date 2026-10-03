import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionFromToken } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/mission", "/results", "/profile", "/dashboard"];

function isApproved(accessStatus: string | undefined): boolean {
  return accessStatus === "approved";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/share/fixes/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Frame-Options", "DENY");
    return response;
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await getSessionFromToken(token);
  const approved = Boolean(session && isApproved(session.accessStatus));

  if (pathname === "/early-access") {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/early-access");
      return NextResponse.redirect(loginUrl);
    }
    if (approved) {
      return NextResponse.redirect(new URL("/dashboard/overview", request.url));
    }
    return NextResponse.next();
  }

  // Signed-in users skip the marketing homepage.
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(
        new URL(approved ? "/dashboard/overview" : "/early-access", request.url)
      );
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (!approved) {
    return NextResponse.redirect(new URL("/early-access", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/early-access",
    "/dashboard",
    "/dashboard/:path*",
    "/mission/:path*",
    "/results/:path*",
    "/profile/:path*",
    "/share/fixes/:path*",
  ],
};
