import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  getOtpExpiry,
  hashOtp,
  isOtpExpired,
  MAX_ATTEMPTS_PER_HOUR,
  normalizeEmail,
} from "./otp";

const OTP_COOKIE = "ghost-otp-pending";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function userIdFromEmail(email: string): string {
  return createHash("sha256")
    .update(normalizeEmail(email))
    .digest("hex")
    .slice(0, 25);
}

interface PendingOtpPayload {
  email: string;
  codeHash: string;
  expiresAt: string;
}

async function signPayload(
  payload: Record<string, unknown>,
  expiresAt: Date
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());
}

async function verifyPayload<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as T;
  } catch {
    return null;
  }
}

/** Per-email cap so one inbox cannot request unlimited codes. */
export async function isRateLimited(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await db.otpToken.count({
    where: { email: normalized, createdAt: { gte: oneHourAgo } },
  });
  return count >= MAX_ATTEMPTS_PER_HOUR;
}

async function storeOtpCookie(email: string, codeHash: string, expiresAt: Date) {
  const token = await signPayload(
    { email, codeHash, expiresAt: expiresAt.toISOString() },
    expiresAt,
  );
  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

/**
 * Persist the hashed code in Postgres (source of truth) and mirror it in a
 * cookie. Cookie-only storage failed when people opened Gmail on another
 * device/browser — verify had nothing to match.
 */
export async function storePendingOtp(
  email: string,
  code: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  const expiresAt = getOtpExpiry();
  const codeHash = hashOtp(code);

  await db.otpToken.updateMany({
    where: { email: normalized, used: false },
    data: { used: true },
  });

  await db.otpToken.create({
    data: {
      email: normalized,
      codeHash,
      expiresAt,
    },
  });

  await storeOtpCookie(normalized, codeHash, expiresAt);
}

async function verifyOtpCookie(
  email: string,
  code: string,
): Promise<{ valid: boolean; reason?: "missing" | "expired" | "incorrect" }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTP_COOKIE)?.value;
  if (!token) return { valid: false, reason: "missing" };

  const payload = await verifyPayload<PendingOtpPayload>(token);
  if (!payload || payload.email !== email) {
    return { valid: false, reason: "missing" };
  }

  const expiresAt = new Date(payload.expiresAt);
  if (isOtpExpired(expiresAt)) {
    cookieStore.delete(OTP_COOKIE);
    return { valid: false, reason: "expired" };
  }

  if (payload.codeHash !== hashOtp(code)) {
    return { valid: false, reason: "incorrect" };
  }

  cookieStore.delete(OTP_COOKIE);
  return { valid: true };
}

export async function verifyPendingOtp(
  email: string,
  code: string
): Promise<{ valid: boolean; reason?: "missing" | "expired" | "incorrect" }> {
  const normalized = normalizeEmail(email);
  const codeHash = hashOtp(code);

  const row = await db.otpToken.findFirst({
    where: { email: normalized, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (row) {
    if (isOtpExpired(row.expiresAt)) {
      await db.otpToken.update({
        where: { id: row.id },
        data: { used: true },
      });
      return { valid: false, reason: "expired" };
    }
    if (row.codeHash !== codeHash) {
      return { valid: false, reason: "incorrect" };
    }
    await db.otpToken.update({
      where: { id: row.id },
      data: { used: true },
    });
    const cookieStore = await cookies();
    cookieStore.delete(OTP_COOKIE);
    return { valid: true };
  }

  return verifyOtpCookie(normalized, code);
}
