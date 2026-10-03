import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";

export const SESSION_COOKIE = "ghost-session";
const SESSION_DURATION = "30d";

export type SessionAccessStatus = "pending" | "approved";

export interface SessionPayload {
  userId: string;
  email: string;
  /** Early-access gate; missing on legacy tokens → treat as pending. */
  accessStatus?: SessionAccessStatus;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    const accessStatus =
      payload.accessStatus === "approved" || payload.accessStatus === "pending"
        ? payload.accessStatus
        : undefined;
    return {
      userId: payload.userId,
      email: payload.email,
      accessStatus,
    };
  } catch {
    return null;
  }
}

const SESSION_COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
  sameSite: "lax" as const,
  path: "/",
};

export const SESSION_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_BASE,
  maxAge: 60 * 60 * 24 * 30,
};

/** Attach the session on the outgoing HTTP response (Route Handlers). */
export function applySessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}

export function applyClearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_BASE,
    maxAge: 0,
  });
  return response;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_BASE,
    maxAge: 0,
  });
}

/** Request-scoped: layout + pages + API helpers share one JWT verify. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

export async function getSessionFromToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  return verifySessionToken(token);
}
