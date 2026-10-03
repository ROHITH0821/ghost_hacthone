import { intEnv } from "@/lib/ghost-engine/config";

/** Missions processed per /api/cron/run-missions run (audits are heavier than finalize). */
export const RUN_CRON_LIMIT = Math.max(
  1,
  Math.min(10, intEnv("RUN_CRON_LIMIT", 3)),
);
