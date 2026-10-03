/** Requires a production `next start` server pointed at the same disposable DB. */
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

async function main() {
  const dbUrl = new URL(process.env.MISSION_TEST_DATABASE_URL ?? 'https://missing.invalid');
  const appUrl = new URL(process.env.MISSION_TEST_APP_URL ?? 'http://localhost:3012');
  assert.ok(['localhost', '127.0.0.1'].includes(dbUrl.hostname) && dbUrl.pathname === '/ghost_reliability');
  assert.ok(['localhost', '127.0.0.1'].includes(appUrl.hostname));
  const db = new PrismaClient({ datasources: { db: { url: dbUrl.href } } });
  const id = `http-smoke-${Date.now()}`;
  let release!: () => void;
  let locked!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { locked = resolve; });
  try {
    // Existing PDF + no recipient + non-eligible audit ensures zero external I/O.
    await db.mission.create({ data: { id, url: 'https://fixture.invalid', domain: 'fixture.invalid', status: 'complete', report: {}, pdfUrl: 'https://fixture.invalid/report.pdf', progress: { finalizeStatus: 'pending', intelStatus: 'not_applicable' } } });
    const blocker = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Mission" WHERE "id" = ${id} FOR UPDATE`;
      locked(); await held;
    }, { timeout: 15000 });
    await ready;
    const start = performance.now();
    try {
      const response = await fetch(new URL(`/api/missions/${id}/finalize?dispatch=1`, appUrl), {
        method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 200); assert.equal((await response.json()).ok, true);
      const acceptanceMs = Math.round(performance.now() - start);
      // The claim is still blocked at the DB, yet the real HTTP response arrived.
      assert.equal((await db.mission.findUniqueOrThrow({ where: { id } })).progress && ((await db.mission.findUniqueOrThrow({ where: { id } })).progress as any).finalizeLease, undefined);
      console.log(JSON.stringify({ event: 'smoke.accepted_while_worker_blocked', acceptanceMs }));
    } finally { release(); await blocker; }
    for (let attempt = 0; attempt < 50; attempt++) {
      const row = await db.mission.findUniqueOrThrow({ where: { id } });
      const progress = row.progress as any;
      if (progress.finalizeStatus === 'complete' && progress.finalizeLease?.token === null) {
        console.log(JSON.stringify({ event: 'smoke.after_completed', finalizationMs: progress.finalizeLease.durationMs }));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('The retained after() worker did not finish');
  } finally {
    release?.(); await db.mission.deleteMany({ where: { id } }); await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
