/**
 * One-off finalize for a single mission (PDF + email).
 *
 * Usage: npx tsx --env-file=.env.local scripts/finalize-mission-once.ts mission-msmz3okv
 */
import { db } from "../src/lib/db";
import { finalizeMission } from "../src/lib/missions/finalize-mission";

const missionId = process.argv[2];
if (!missionId) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/finalize-mission-once.ts <missionId>");
  process.exit(1);
}

async function main() {
  const result = await finalizeMission(missionId, { force: true });
  console.log(JSON.stringify(result, null, 2));

  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { pdfUrl: true, domain: true, progress: true },
  });
  console.log("Mission after finalize:", JSON.stringify(mission, null, 2));
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
