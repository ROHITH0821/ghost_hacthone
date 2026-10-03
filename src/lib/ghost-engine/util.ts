import { assertExecutionActive, executionContext, executionLog } from "@/lib/missions/execution-context";
import { intEnv } from "./config";
import { APIConnectionError } from "@anthropic-ai/sdk";

/**
 * Run `fn` over `items` with at most `limit` in flight at once. Returns settled
 * results in input order, so one failure never rejects the whole batch (mirrors
 * Promise.allSettled semantics, but bounded).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (let i = next++; i < items.length; i = next++) {
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, worker));
  return results;
}

/** Reject if `promise` has not settled within `ms`. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const STRUCTURED_PARSE_TIMEOUT_MS = Math.min(300_000, Math.max(1000, intEnv("GHOST_STRUCTURED_PARSE_TIMEOUT_MS", 180_000)));
export class LlmTimeoutError extends Error {
  constructor() { super("LLM request timed out"); this.name = "LlmTimeoutError"; }
}
export function isRetryableLlmError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as { status?: number }).status;
  if (status !== undefined) return [408, 409, 429].includes(status) || status >= 500;
  return error instanceof LlmTimeoutError || error instanceof APIConnectionError;
}

/** One retry policy; callers disable SDK retries and pass this abort signal to the request. */
export async function parseStructuredWithTimeout<T>(
  label: string,
  run: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; sleep?: (ms: number) => Promise<void>; random?: () => number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? STRUCTURED_PARSE_TIMEOUT_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; ; attempt++) {
    assertExecutionActive();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { const error = new LlmTimeoutError(); controller.abort(error); reject(error); }, timeoutMs);
      });
      return await Promise.race([run(controller.signal), timedOut]);
    } catch (caught) {
      const error = controller.signal.reason instanceof LlmTimeoutError ? controller.signal.reason : caught;
      if (attempt >= 2 || !isRetryableLlmError(error)) throw error;
      assertExecutionActive();
      const headers = (error as { headers?: Headers }).headers;
      const retryAfter = headers?.get?.("retry-after");
      const requested = retryAfter ? (Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : 0;
      const delayMs = Math.min(60_000, Math.max(Number.isFinite(requested) ? requested : 0, 1000 * 2 ** attempt + (options.random ?? Math.random)() * 250));
      const ctx = executionContext.getStore();
      if (ctx) ctx.retries++;
      executionLog("llm.retry", { stage: label, attempt: attempt + 1, delayMs, reason: error instanceof Error ? error.name : "UnknownError" });
      if (timer) clearTimeout(timer);
      await sleep(delayMs);
    } finally { if (timer) clearTimeout(timer); }
  }
}
