import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { executionContext, executionLog, assertExecutionActive, LeaseLostError, type Execution } from "./execution-context";

// Includes headroom above the deployed 800-second invocation limit. No heartbeat required.
export const MISSION_LEASE_MS = 900_000;
export type MissionPhase = Execution["phase"];
const keyFor = (phase: MissionPhase) => phase === "audit" ? "auditLease" : "finalizeLease";

/** One PostgreSQL compare-and-set; ownership is never decided by a preceding read. */
export async function acquireMissionLease(missionId: string, phase: MissionPhase, force = false): Promise<Execution | null> {
  const key = keyFor(phase), token = randomUUID();
  const eligible = phase === "audit"
    ? Prisma.sql`(("status" = 'running' AND "report" IS NULL) OR (${force} AND "status" = 'error'))`
    : Prisma.sql`("status" = 'complete' AND "report" IS NOT NULL)`;
  const rows = await db.$queryRaw<Array<{ lease: { acquiredAt: number; expiresAt: number; attempt: number } }>>`
    UPDATE "Mission" SET
      "progress" = COALESCE("progress", '{}'::jsonb) || jsonb_build_object(${key}::text, jsonb_build_object(
        'token', ${token}::text,
        'acquiredAt', floor(extract(epoch from clock_timestamp()) * 1000),
        'expiresAt', floor(extract(epoch from clock_timestamp()) * 1000) + ${MISSION_LEASE_MS}::bigint,
        'attempt', COALESCE(("progress"->${key}::text->>'attempt')::int, 0) + 1)),
      "updatedAt" = clock_timestamp()
    WHERE "id" = ${missionId} AND ${eligible}
      AND ("progress"->${key}::text->>'token' IS NULL
        OR COALESCE(("progress"->${key}::text->>'expiresAt')::numeric, 0) <= extract(epoch from clock_timestamp()) * 1000)
      AND (${phase !== "audit" || force} OR "progress"->'auditLease' IS NOT NULL
        OR COALESCE("progress"->>'auditRunStatus', '') <> 'running'
        OR "updatedAt" < clock_timestamp() - interval '15 minutes')
    RETURNING "progress"->${key}::text AS lease
  `;
  if (!rows[0]) return null;
  return { missionId, phase, token, attempt: rows[0].lease.attempt, startedAt: Number(rows[0].lease.acquiredAt), expiresAt: Number(rows[0].lease.expiresAt), retries: 0, durations: {}, active: true };
}

/** SQL fence for atomic progress writes, including expiry checks on the database clock. */
export function missionLeaseFence(missionId: string): Prisma.Sql {
  const ctx = executionContext.getStore();
  if (!ctx || ctx.missionId !== missionId) return Prisma.sql`TRUE`;
  assertExecutionActive();
  const key = keyFor(ctx.phase);
  return Prisma.sql`("progress"->${key}::text->>'token' = ${ctx.token}
    AND ("progress"->${key}::text->>'expiresAt')::numeric > extract(epoch from clock_timestamp()) * 1000)`;
}

/** Prisma extended unique predicate fences report/PDF/preview/intelligence writes atomically. */
export function missionWriteWhere(missionId: string): Prisma.MissionWhereUniqueInput {
  const ctx = executionContext.getStore();
  if (!ctx || ctx.missionId !== missionId) return { id: missionId };
  assertExecutionActive();
  return { id: missionId, AND: [
    { progress: { path: [keyFor(ctx.phase), "token"], equals: ctx.token } },
    { progress: { path: [keyFor(ctx.phase), "expiresAt"], gt: Date.now() } },
  ] };
}

export async function assertMissionLease() {
  const ctx = executionContext.getStore();
  if (!ctx) return;
  const rows = await db.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Mission" WHERE "id" = ${ctx.missionId} AND ${missionLeaseFence(ctx.missionId)}`;
  if (!rows.length) throw new LeaseLostError();
}

export async function withMissionLease<T>(lease: Execution, work: () => Promise<T>): Promise<T> {
  return executionContext.run(lease, async () => {
    executionLog("mission.start");
    let failure: string | null = null;
    try { return await work(); }
    catch (error) { failure = error instanceof Error ? error.name : "UnknownError"; throw error; }
    finally {
      const durationMs = Date.now() - lease.startedAt;
      failure ??= lease.failure ?? null;
      executionLog("mission.finish", { durationMs, stageDurations: lease.durations, failure });
      lease.active = false;
      const key = keyFor(lease.phase);
      // Retain attempt/timing history when releasing. A stale worker cannot release its successor.
      await db.$executeRaw`
        UPDATE "Mission" SET "progress" = "progress" || jsonb_build_object(${key}::text,
          ("progress"->${key}::text) || ${JSON.stringify({ token: null, expiresAt: 0, finishedAt: Date.now(), durationMs, stageDurations: lease.durations, retryCount: lease.retries, failure })}::jsonb)
        WHERE "id" = ${lease.missionId} AND "progress"->${key}::text->>'token' = ${lease.token}
      `.catch(() => executionLog("mission.release_failed"));
    }
  });
}
