/** Real DB and HTTP routes. Requires the local app to use this disposable DB and AUTH_SECRET. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { randomBytes } from 'node:crypto';

const databaseUrl = new URL(process.env.FIX_SHARE_TEST_DATABASE_URL ?? 'https://missing.invalid');
const origin = process.env.FIX_SHARE_TEST_APP_URL ?? 'http://localhost:3010';
assert.ok(['localhost', '127.0.0.1'].includes(databaseUrl.hostname) && databaseUrl.pathname === '/ghost_fix_share');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
assert.ok(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
const db = new PrismaClient({ datasources: { db: { url: databaseUrl.href } } });
const prefix = `share-test-${randomBytes(5).toString('hex')}`;
const owner = `${prefix}-owner`, stranger = `${prefix}-stranger`, site = `${prefix}-site`, mission = `${prefix}-mission`, fix = `${prefix}-fix`;
let ownerCookie = '', strangerCookie = '', pendingCookie = '', token = '';
const input = { pageUrl: 'https://studio.example/services', issue: 'Package inclusions are unclear.', suggestedChange: 'Publish confirmed inclusions.', acceptanceCriteria: ['Inclusions appear beside the quote button.', 'Check mobile and desktop.'] };
async function cookie(userId: string, accessStatus = 'approved') {
  const value = await new SignJWT({ userId, email: `${userId}@example.invalid`, accessStatus }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return `ghost-session=${value}`;
}
function request(method = 'GET', session = ownerCookie, body?: unknown, requestOrigin = origin) {
  return fetch(`${origin}/api/dashboard/fixes/${fix}/share`, { method, redirect: 'manual', headers: { cookie: session, origin: requestOrigin, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
  await db.user.createMany({ data: [owner, stranger].map(id => ({ id, email: `${id}@example.invalid`, accessStatus: 'approved' })) });
  await db.site.create({ data: { id: site, userId: owner, canonicalDomain: 'studio.example' } });
  await db.mission.create({ data: { id: mission, userId: owner, siteId: site, url: 'https://studio.example', domain: 'studio.example', status: 'complete', report: { url: 'https://studio.example', leaks: [{ id: 'leak-1', category: '/services', whatIsWrong: input.issue, whyCustomersLeave: 'PRIVATE QUOTE' }], fixes: [], privateAnalytics: 'PRIVATE GA4' } } });
  await db.fixStatus.create({ data: { id: fix, userId: owner, siteId: site, missionId: mission, sourceKey: 'leak:leak-1', leakId: 'leak-1', title: 'Clarify package pricing', kind: 'leak', fixContent: input.suggestedChange, note: 'PRIVATE INTERNAL NOTE' } });
  [ownerCookie, strangerCookie, pendingCookie] = await Promise.all([cookie(owner), cookie(stranger), cookie(owner, 'pending')]);
});
after(async () => {
  await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
  await db.mission.deleteMany({ where: { id: mission } });
  await db.$disconnect();
});

test('management requires approved ownership and same-origin writes', async () => {
  assert.equal((await request('GET', '')).status, 401);
  assert.equal((await request('GET', pendingCookie)).status, 403);
  for (const method of ['GET', 'POST', 'DELETE']) assert.equal((await request(method, strangerCookie, method === 'POST' ? input : undefined)).status, 404);
  assert.equal((await request('POST', ownerCookie, input, 'https://other.example')).status, 403);
  assert.equal((await request('POST', ownerCookie, { ...input, pageUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await request('POST', ownerCookie, { ...input, accountId: 'private' })).status, 400);
  const response = await request(); const body = await response.json();
  assert.equal(body.share, null); assert.equal(body.draft.pageUrl, input.pageUrl);
  assert.equal(JSON.stringify(body).includes('PRIVATE'), false);
  assert.match(response.headers.get('cache-control')!, /no-store/);
});

test('parallel publication reuses one unpredictable link and exposes only the reviewed snapshot', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, async () => {
    const response = await request('POST', ownerCookie, input); assert.equal(response.status, 200); return response.json();
  }));
  assert.equal(new Set(results.map(result => result.share.path)).size, 1);
  token = results[0].share.path.split('/').pop(); assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await db.fixShare.count({ where: { fixId: fix } }), 1);
  const response = await fetch(`${origin}/share/fixes/${token}`);
  const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Acceptance checklist/); assert.match(html, /Publish confirmed inclusions/);
  assert.equal(html.includes('PRIVATE'), false); assert.equal(html.includes(owner), false);
  assert.equal(html.includes('/_vercel/insights/script.js'), false);
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.match(response.headers.get('x-robots-tag')!, /noindex/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('owner edits update the existing snapshot without expanding report access', async () => {
  const response = await request('POST', ownerCookie, { ...input, issue: 'Owner-reviewed updated issue.' });
  assert.equal((await response.json()).share.path, `/share/fixes/${token}`);
  const html = await (await fetch(`${origin}/share/fixes/${token}`)).text();
  assert.match(html, /Owner-reviewed updated issue/);
  assert.equal((await db.fixStatus.findUniqueOrThrow({ where: { id: fix } })).status, 'recommended');
});

test('expired links stop resolving and renewal rotates the token', async () => {
  await db.fixShare.update({ where: { fixId: fix }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const expired = await fetch(`${origin}/share/fixes/${token}`); const html = await expired.text();
  assert.match(html, /This handoff is unavailable/); assert.equal(html.includes('Owner-reviewed updated issue'), false);
  assert.equal((await (await request()).json()).share, null);
  const replacement = await (await request('POST', ownerCookie, input)).json();
  const next = replacement.share.path.split('/').pop(); assert.notEqual(next, token);
  assert.match(await (await fetch(`${origin}/share/fixes/${token}`)).text(), /This handoff is unavailable/);
  token = next;
});

test('revocation and source deletion remove public access', async () => {
  assert.equal((await request('DELETE')).status, 200);
  const html = await (await fetch(`${origin}/share/fixes/${token}`)).text();
  assert.match(html, /This handoff is unavailable/); assert.equal(html.includes(input.suggestedChange), false);
  const replacement = await (await request('POST', ownerCookie, input)).json();
  token = replacement.share.path.split('/').pop();
  await db.fixStatus.delete({ where: { id: fix } });
  assert.equal(await db.fixShare.count({ where: { fixId: fix } }), 0);
  assert.match(await (await fetch(`${origin}/share/fixes/${token}`)).text(), /This handoff is unavailable/);
});
