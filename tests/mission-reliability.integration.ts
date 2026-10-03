/** Run only against a disposable PostgreSQL database; see docs/mission-reliability.md. */
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pack, flow, journey, report } from './fixtures';

const require = createRequire(import.meta.url);
const testUrl = new URL(process.env.MISSION_TEST_DATABASE_URL ?? 'https://missing.invalid');
if (!['localhost', '127.0.0.1'].includes(testUrl.hostname) || testUrl.pathname !== '/ghost_reliability') {
  throw new Error('Set MISSION_TEST_DATABASE_URL to the disposable localhost ghost_reliability database');
}
process.env.DATABASE_URL = testUrl.href;
process.env.CRON_SECRET = 'local-test-secret';
process.env.RESEND_API_KEY = 're_test_fixture_only';
process.env.NEXT_PUBLIC_APP_URL = 'https://ghost.example';
process.env.GHOST_STRUCTURED_PARSE_TIMEOUT_MS = '1000';
// Replace external I/O at module boundaries; retain real routes, pipeline, database and leases.
function replaceModule(path: string, overrides: Record<string, unknown>) {
  const id = require.resolve(path);
  const original = require(path);
  require.cache[id]!.exports = { ...original, ...overrides };
}
const { db } = require('../src/lib/db') as typeof import('../src/lib/db');
const { timeStage, executionContext } = require('../src/lib/missions/execution-context') as typeof import('../src/lib/missions/execution-context');
let pdfs = 0, uploads = 0, emails = 0, parses = 0, failEmail = false;
let failAggregation = false;
let slowCrawl: Promise<void> | undefined;
const callbacks: Array<() => Promise<void>> = [];
replaceModule('next/server', { after: (fn: () => Promise<void>) => { callbacks.push(fn); } });
replaceModule('../src/lib/ghost-engine/ingest', {
  ingestUrl: async () => timeStage('crawl', async () => { if (slowCrawl) await slowCrawl; return pack; }),
});
replaceModule('../src/lib/ghost-engine/client', {
  anthropic: () => ({ messages: { parse: async (body: { output_config: { format: { schema: { properties: Record<string, unknown> } } } }, options: { signal: AbortSignal; maxRetries: number }) => {
    parses++;
    assert.equal(options.maxRetries, 0); assert.ok(options.signal);
    const props = body.output_config.format.schema.properties;
    if (props.flows) return { parsed_output: { flows: [flow] } };
    if (props.journey) return { parsed_output: journey };
    if (props.leaks) {
      if (failAggregation) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
      return { parsed_output: report };
    }
    if (props.fix_type) return { parsed_output: { leak_rank: 1, fix_type: 'faq', title: 'Package FAQ', variants: ['Confirm package inclusions with us.'], usage_hint: 'Review before publishing', rationale: 'Clarify the package' } };
    throw new Error('Unexpected LLM request');
  } } }),
});
replaceModule('../src/lib/storage/supabase', {
  uploadMissionPdf: async ({ missionId }: { missionId: string }) => { uploads++; return { publicUrl: `https://storage.example/${missionId}.pdf` }; },
  uploadMissionPreview: async () => { throw new Error('Unexpected preview'); },
});
replaceModule('../src/lib/report/reportPdf', { generateGhostReportPdf: async () => { pdfs++; await new Promise(r => setTimeout(r, 30)); return Buffer.from('fixture PDF'); } });
replaceModule('../src/lib/db/pdf-brand', { getPdfBrandForUser: async () => undefined });
replaceModule('../src/lib/missions/run-competitor-intel', { retryMissionCompetitorIntelIfNeeded: async () => null });
const { acquireMissionLease, withMissionLease } = require('../src/lib/missions/lease') as typeof import('../src/lib/missions/lease');
const { runAuditMission, findMissionsNeedingRun } = require('../src/lib/missions/run-audit-mission') as typeof import('../src/lib/missions/run-audit-mission');
const { finalizeMission, findMissionsNeedingFinalize } = require('../src/lib/missions/finalize-mission') as typeof import('../src/lib/missions/finalize-mission');
const { patchMissionProgress, persistMissionPdf, expireStaleRunningMission } = require('../src/lib/db/missions') as typeof import('../src/lib/db/missions');
const { NextRequest } = require('next/server') as typeof import('next/server');
const runRoute = require('../src/app/api/missions/[id]/run/route') as typeof import('../src/app/api/missions/[id]/run/route');
const finalizeRoute = require('../src/app/api/missions/[id]/finalize/route') as typeof import('../src/app/api/missions/[id]/finalize/route');
const runCron = require('../src/app/api/cron/run-missions/route') as typeof import('../src/app/api/cron/run-missions/route');
const finalizeCron = require('../src/app/api/cron/finalize-missions/route') as typeof import('../src/app/api/cron/finalize-missions/route');
const realFetch = globalThis.fetch;
const invocations: string[] = [];
globalThis.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  if (parsed.hostname === 'storage.example') return new Response(Buffer.from('fixture PDF'));
  if (parsed.hostname === 'api.resend.com') {
    emails++;
    assert.match(new Headers(init?.headers).get('idempotency-key') ?? '', /^audit-complete\//);
    return failEmail ? Response.json({ name: 'validation_error', message: 'Simulated failed delivery' }, { status: 400 }) : Response.json({ id: 'fixture-email' });
  }
  if (parsed.hostname !== 'ghost.example') throw new Error('External network prohibited in this test');
  const parts = parsed.pathname.split('/');
  const route = parts[4] === 'run' ? runRoute : finalizeRoute;
  invocations.push(parsed.pathname);
  return route.POST(new NextRequest(parsed, { ...init, signal: init?.signal ?? undefined }), { params: Promise.resolve({ id: parts[3] }) });
};
async function createMission(id: string) {
  return db.mission.create({ data: { id, domain: 'studio.example', url: 'https://studio.example', userId: 'reliability-user', progress: { auditRunStatus: 'pending' } } });
}
async function drainWorkers() { while (callbacks.length) await Promise.all(callbacks.splice(0).map(fn => fn())); }
function cronRequest(path: string) { return new NextRequest(`https://ghost.example/api/cron/${path}`, { headers: { authorization: 'Bearer local-test-secret' } }); }
beforeEach(async () => {
  await db.notificationLog.deleteMany(); await db.mission.deleteMany();
  await db.user.upsert({ where: { id: 'reliability-user' }, create: { id: 'reliability-user', email: 'fixture@example.invalid' }, update: {} });
  callbacks.length = 0; invocations.length = 0; pdfs = uploads = emails = parses = 0;
  failAggregation = failEmail = false; slowCrawl = undefined;
});
after(async () => { globalThis.fetch = realFetch; await db.$disconnect(); });

test('single audit dispatch runs actual AI stages, persists report and finalizes once', async () => {
  await createMission('single');
  const response = await runCron.GET(cronRequest('run-missions'));
  assert.equal((await response.json()).processed, 1); assert.equal(parses, 0);
  await drainWorkers();
  const mission = await db.mission.findUniqueOrThrow({ where: { id: 'single' } });
  assert.equal(mission.status, 'complete'); assert.ok(mission.report); assert.ok(mission.pdfUrl);
  const progress = mission.progress as Record<string, any>;
  assert.equal(progress.finalizeStatus, 'complete');
  for (const stage of ['crawl', 'flow_analysis', 'swarm', 'aggregation', 'fix_generation']) assert.equal(typeof progress.auditLease.stageDurations[stage], 'number');
  assert.equal(typeof progress.finalizeLease.stageDurations.finalization, 'number');
  assert.equal(parses, 4); assert.equal(pdfs, 1); assert.equal(uploads, 1); assert.equal(emails, 1);
  assert.equal(await db.notificationLog.count(), 1);
});

test('two duplicate crons return before blocked crawling and give each mission one worker', async () => {
  await Promise.all(['one', 'two', 'three'].map(createMission));
  let unblock!: () => void;
  slowCrawl = new Promise(resolve => { unblock = resolve; });
  const start = performance.now();
  const responses = await Promise.all([runCron.GET(cronRequest('run-missions')), runCron.GET(cronRequest('run-missions'))]);
  assert.ok(performance.now() - start < 1000);
  assert.equal(invocations.length, 6); assert.equal(parses, 0);
  for (const response of responses) assert.equal((await response.json()).processed, 3);
  const working = drainWorkers();
  await new Promise(r => setTimeout(r, 50));
  assert.equal(await db.mission.count({ where: { status: 'complete' } }), 0);
  unblock(); await working;
  assert.equal(await db.mission.count({ where: { status: 'complete' } }), 3);
  assert.equal(parses, 12); assert.equal(pdfs, 3); assert.equal(uploads, 3); assert.equal(emails, 3);
});

test('atomic claims reject forced duplicates; crashed leases expire and stale writers are fenced', async () => {
  await createMission('crash');
  const claims = await Promise.all(Array.from({ length: 8 }, () => acquireMissionLease('crash', 'audit', true)));
  assert.equal(claims.filter(Boolean).length, 1);
  const old = claims.find(Boolean)!;
  assert.deepEqual(await findMissionsNeedingRun(10), []);
  await db.$executeRaw`UPDATE "Mission" SET "progress" = jsonb_set("progress", '{auditLease,expiresAt}', '1'::jsonb) WHERE "id" = 'crash'`;
  assert.deepEqual(await findMissionsNeedingRun(10), ['crash']);
  const successor = await acquireMissionLease('crash', 'audit'); assert.ok(successor);
  await withMissionLease(old, async () => {
    await assert.rejects(patchMissionProgress('crash', { shouldNotExist: true }), /lease/i);
    await assert.rejects(persistMissionPdf('crash', { pdfUrl: 'https://bad.example/stale.pdf' }));
  });
  const row = await db.mission.findUniqueOrThrow({ where: { id: 'crash' } });
  assert.equal((row.progress as any).auditLease.token, successor.token); assert.equal(row.pdfUrl, null);
  await withMissionLease(successor, async () => patchMissionProgress('crash', { recovered: true }));
  assert.equal((await runAuditMission('crash')).ok, true); await drainWorkers();
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: 'crash' } })).status, 'complete');
});

test('stale poll cannot kill a healthy lease or a completed mission', async () => {
  await createMission('healthy');
  const lease = await acquireMissionLease('healthy', 'audit'); assert.ok(lease);
  const oldDate = new Date(Date.now() - 30 * 60_000);
  await db.mission.update({ where: { id: 'healthy' }, data: { updatedAt: oldDate } });
  await expireStaleRunningMission({ missionId: 'healthy', status: 'running', updatedAt: oldDate });
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: 'healthy' } })).status, 'running');
  assert.equal(await acquireMissionLease('healthy', 'audit', true), null);
  await withMissionLease(lease, async () => {});
  await runAuditMission('healthy'); await drainWorkers();
  await expireStaleRunningMission({ missionId: 'healthy', status: 'running', updatedAt: oldDate });
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: 'healthy' } })).status, 'complete');
});

test('aggregation timeout exhaustion persists terminal failure and releases the lease', async () => {
  await createMission('timeout'); failAggregation = true;
  assert.equal((await runAuditMission('timeout')).ok, false);
  const row = await db.mission.findUniqueOrThrow({ where: { id: 'timeout' } });
  assert.equal(row.status, 'error'); assert.equal((row.progress as any).auditRunStatus, 'failed');
  assert.equal((row.progress as any).auditLease.token, null);
  assert.equal((row.progress as any).auditLease.retryCount, 2);
  assert.match((row.progress as any).auditLease.failure, /aggregation:LlmTimeoutError/);
  assert.equal(pdfs, 0); assert.equal(emails, 0);
});

test('duplicate finalization makes one PDF/upload/email; failed delivery is recoverable', async () => {
  await createMission('final'); await runAuditMission('final'); callbacks.length = 0;
  failEmail = true;
  const results = await Promise.all([finalizeMission('final', { force: true }), finalizeMission('final', { force: true })]);
  assert.equal(results.filter(r => r.skipped).length, 1);
  assert.equal(pdfs, 1); assert.equal(uploads, 1); assert.equal(emails, 1);
  assert.equal(await db.notificationLog.count(), 0);
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: 'final' } })).progress && (await findMissionsNeedingFinalize(10)).includes('final'), true);
  failEmail = false;
  const start = performance.now();
  const responses = await Promise.all([finalizeCron.GET(cronRequest('finalize-missions')), finalizeCron.GET(cronRequest('finalize-missions'))]);
  assert.ok(performance.now() - start < 1000);
  for (const response of responses) assert.equal((await response.json()).processed, 1);
  await drainWorkers();
  assert.equal(pdfs, 1); assert.equal(uploads, 1); assert.equal(emails, 2); assert.equal(await db.notificationLog.count(), 1);
  assert.equal((await finalizeMission('final')).skipped, true); assert.equal(emails, 2);
  assert.deepEqual(await findMissionsNeedingFinalize(10), []);
  // Crash after delivery was recorded, before the final progress write.
  await patchMissionProgress('final', { finalizeStatus: 'pending' });
  assert.deepEqual(await findMissionsNeedingFinalize(10), ['final']);
  assert.equal((await finalizeMission('final')).ok, true);
  assert.equal(pdfs, 1); assert.equal(emails, 2);
});

test('recovery filters before LIMIT and route authentication remains mandatory', async () => {
  await Promise.all(Array.from({ length: 20 }, (_, i) => createMission(`old-${i}`)));
  await db.mission.updateMany({ data: { status: 'complete', report: {}, pdfUrl: 'https://storage.example/report.pdf', userId: null, progress: { finalizeStatus: 'complete' } } });
  await createMission('new');
  assert.deepEqual(await findMissionsNeedingRun(1), ['new']);
  assert.deepEqual(await findMissionsNeedingFinalize(1), []);
  const request = new NextRequest('https://ghost.example/api/missions/new/run?dispatch=1');
  assert.equal((await runRoute.POST(request, { params: Promise.resolve({ id: 'new' }) })).status, 401);
  assert.equal((await runCron.GET(new NextRequest('https://ghost.example/api/cron/run-missions'))).status, 401);
  assert.equal(callbacks.length, 0);
});
