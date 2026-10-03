import { AsyncLocalStorage } from "node:async_hooks";

export type Execution = {
  missionId: string;
  phase: "audit" | "finalize";
  token: string;
  attempt: number;
  startedAt: number;
  expiresAt: number;
  retries: number;
  durations: Record<string, number>;
  active: boolean;
  failure?: string;
};
export const executionContext = new AsyncLocalStorage<Execution>();
export function executionLog(event: string, fields: Record<string, unknown> = {}) {
  const ctx = executionContext.getStore();
  console.log(JSON.stringify({ event, ...(ctx ? {
    missionId: ctx.missionId, invocationId: ctx.token, phase: ctx.phase,
    attempt: ctx.attempt, retryCount: ctx.retries, startedAt: new Date(ctx.startedAt).toISOString(),
  } : {}), ...fields }));
}
export async function timeStage<T>(stage: string, work: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try { return await work(); }
  catch (error) {
    const failure = error instanceof Error ? error.name : "UnknownError";
    const ctx = executionContext.getStore();
    if (ctx) ctx.failure = `${stage}:${failure}`;
    executionLog("mission.stage_failed", { stage, failure });
    throw error;
  }
  finally {
    const durationMs = Date.now() - start;
    const ctx = executionContext.getStore();
    if (ctx) ctx.durations[stage] = (ctx.durations[stage] ?? 0) + durationMs;
    executionLog("mission.stage", { stage, durationMs });
  }
}
export class LeaseLostError extends Error {
  constructor() { super("Mission execution lease expired or was replaced"); this.name = "LeaseLostError"; }
}
export function assertExecutionActive() {
  const ctx = executionContext.getStore();
  if (ctx && (!ctx.active || Date.now() >= ctx.expiresAt)) throw new LeaseLostError();
}
