import { cache } from "react";
import { normalizeEmail } from "@/lib/auth/otp";
import { db } from "@/lib/db";

export type AccessStatus = "pending" | "approved";

export function normalizeAccessStatus(value: string | null | undefined): AccessStatus {
  return value === "approved" ? "approved" : "pending";
}

export async function upsertUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  return db.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      accessStatus: "pending",
    },
    // Never reset accessStatus / approvedAt on login.
    update: {},
  });
}

export const getUserById = cache(async (userId: string) => {
  return db.user.findUnique({ where: { id: userId } });
});

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

export const getUserAccessStatus = cache(
  async (userId: string): Promise<AccessStatus> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { accessStatus: true },
    });
    return normalizeAccessStatus(user?.accessStatus);
  }
);

export async function isUserApproved(userId: string): Promise<boolean> {
  return (await getUserAccessStatus(userId)) === "approved";
}

/**
 * Prefer the session userId (read path). Falls back to email upsert only for
 * legacy tokens whose userId is not a DB row — avoids an upsert on every API call.
 */
export const resolveUserIdFromSession = cache(
  async (userId: string, email: string): Promise<string> => {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const user = await upsertUserByEmail(email);
    return user.id;
  }
);

/** @deprecated Prefer resolveUserIdFromSession(session.userId, session.email). */
export async function resolveUserId(email: string): Promise<string> {
  const user = await upsertUserByEmail(email);
  return user.id;
}
