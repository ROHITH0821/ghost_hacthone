import { intEnv } from "@/lib/ghost-engine/config";
import { db } from "@/lib/db";
import { copy } from "@/lib/copy";

/** Max audits running at once per user. */
export const AUDIT_MAX_CONCURRENT = Math.max(
  1,
  Math.min(10, intEnv("AUDIT_MAX_CONCURRENT", 3)),
);

/** Max audit submissions per user per rolling hour. */
export const AUDIT_MAX_PER_HOUR = Math.max(
  1,
  Math.min(50, intEnv("AUDIT_MAX_PER_HOUR", 10)),
);

export type AuditRateLimitResult =
  | { ok: true }
  | { ok: false; error: string; code: string };

export async function assertAuditRateLimit(
  userId: string,
): Promise<AuditRateLimitResult> {
  const [concurrent, hourly] = await Promise.all([
    db.mission.count({ where: { userId, status: "running" } }),
    db.mission.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    }),
  ]);

  if (concurrent >= AUDIT_MAX_CONCURRENT) {
    return {
      ok: false,
      code: "audit_concurrent_limit",
      error: copy.authApi.auditConcurrentLimit(AUDIT_MAX_CONCURRENT),
    };
  }

  if (hourly >= AUDIT_MAX_PER_HOUR) {
    return {
      ok: false,
      code: "audit_hourly_limit",
      error: copy.authApi.auditHourlyLimit(AUDIT_MAX_PER_HOUR),
    };
  }

  return { ok: true };
}
