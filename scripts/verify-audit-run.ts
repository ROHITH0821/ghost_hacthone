/**
 * Smoke-test audit run idempotency and cron discovery.
 *
 * Usage: npx tsx --env-file=.env.local scripts/verify-audit-run.ts
 */
import { db } from "../src/lib/db";
import { Prisma } from "@prisma/client";
import {
  findMissionsNeedingRun,
  isAuditRunComplete,
  runAuditMission,
} from "../src/lib/missions/run-audit-mission";

async function main() {
  const completeId = "mission-msmz3okv";
  const complete = await isAuditRunComplete(completeId);
  console.log("isAuditRunComplete (gadget360):", complete);

  const skip = await runAuditMission(completeId);
  console.log("runAuditMission skip on complete:", skip);

  const needs = await findMissionsNeedingRun(5);
  console.log("findMissionsNeedingRun count:", needs.length, needs.slice(0, 3));

  const running = await db.mission.findFirst({
    where: { status: "running", report: { equals: Prisma.DbNull } },
    select: { id: true, url: true, domain: true, progress: true },
  });
  if (running) {
    const progress = running.progress as { auditRunStatus?: string; currentStage?: string };
    console.log(
      "running mission sample:",
      running.id,
      "auditRunStatus=",
      progress?.auditRunStatus,
      "stage=",
      progress?.currentStage,
    );
  } else {
    console.log("no running missions without report");
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
