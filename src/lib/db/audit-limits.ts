import { intEnv } from "@/lib/ghost-engine/config";

/** Window for server-side duplicate submit dedup (same user + domain). */
export const AUDIT_DEDUP_WINDOW_MS = Math.max(
  10_000,
  intEnv("AUDIT_DEDUP_WINDOW_MS", 60_000),
);
