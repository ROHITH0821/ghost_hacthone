import Anthropic from "@anthropic-ai/sdk";
import { intEnv } from "./config";

/**
 * Lazily-constructed shared Anthropic client.
 *
 * Constructing eagerly would throw at import time when ANTHROPIC_API_KEY is
 * absent (e.g. during `next build` or in CI). Deferring construction to first
 * use keeps the module import-safe; the key is read from the environment.
 *
 * maxRetries handles transient 429/5xx/connection errors with backoff. Models,
 * token budgets, and concurrency live in config.ts.
 */
let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  const timeout = intEnv("GHOST_ANTHROPIC_TIMEOUT_MS", 180_000);
  return (client ??= new Anthropic({ maxRetries: 2, timeout }));
}
