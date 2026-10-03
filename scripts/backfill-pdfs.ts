import { db } from "../src/lib/db";
import { findMissionsNeedingFinalize, finalizeMission } from "../src/lib/missions/finalize-mission";
import {
  retryMissionCompetitorIntelIfNeeded,
  runMissionCompetitorIntel,
} from "../src/lib/missions/run-competitor-intel";
import { persistIntelStatus } from "../src/lib/db/missions";
import type { GhostReport } from "../src/lib/types";
import { contextPackFromReport } from "../src/lib/competitor-intelligence/context-from-report";

async function main() {
  const limit = process.env.BACKFILL_LIMIT ? Number(process.env.BACKFILL_LIMIT) : 50;
  const dryRun = process.env.DRY_RUN === "1";
  const force = process.env.FORCE === "1";
  const backfillIntel = process.env.BACKFILL_INTEL === "1";

  if (Number.isNaN(limit) || limit <= 0) {
    throw new Error("BACKFILL_LIMIT must be a positive number");
  }

  const missionIds = force
    ? (
        await db.mission.findMany({
          where: { status: "complete", pdfUrl: null },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      ).map((m) => m.id)
    : await findMissionsNeedingFinalize(limit);

  console.log(`Found ${missionIds.length} mission(s) to finalize (limit=${limit}).`);

  for (const missionId of missionIds) {
    console.log(`\n${missionId}`);
    if (dryRun) {
      console.log("DRY_RUN=1, skipping finalize.");
      continue;
    }

    if (backfillIntel) {
      const mission = await db.mission.findUnique({
        where: { id: missionId },
        select: { url: true, domain: true, report: true, progress: true, competitorIntelligence: true },
      });
      if (!mission?.report) {
        console.log("BACKFILL_INTEL=1, skipping — no report.");
      } else {
        const report = mission.report as unknown as GhostReport;
        const progress = (mission.progress ?? {}) as { intelStatus?: string };

        if (progress.intelStatus === "failed" && !mission.competitorIntelligence) {
          console.log("BACKFILL_INTEL=1, retrying competitor research…");
          const intelResult = await runMissionCompetitorIntel({
            missionId,
            url: mission.url,
            domain: mission.domain,
            ownerContextPack: contextPackFromReport(report),
            ownerReport: report,
          });
          await persistIntelStatus(missionId, {
            intelStatus: intelResult.status,
            intelError: intelResult.error ?? null,
          });
          console.log(`Intel retry: status=${intelResult.status}`);
        } else {
          const retry = await retryMissionCompetitorIntelIfNeeded({
            missionId,
            url: mission.url,
            domain: mission.domain,
            ownerReport: report,
            force: true,
          });
          if (retry) {
            await persistIntelStatus(missionId, {
              intelStatus: retry.status,
              intelError: retry.error ?? null,
            });
            console.log(`Intel retry: status=${retry.status}`);
          }
        }
      }
    }

    const result = await finalizeMission(missionId, { force });
    console.log(
      `Result: ok=${result.ok} skipped=${result.skipped} intel=${result.intelOk} pdf=${result.pdfOk} email=${result.emailOk}`,
    );
    if (result.errors.length) {
      console.log("Errors:", result.errors.join("; "));
    }
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
