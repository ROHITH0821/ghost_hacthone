// Local browser regression: all APIs and Google sign-in are intercepted. No real audit or account writes.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.UI_REVIEW_URL ?? 'http://127.0.0.1:3010';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local server required');
const routeName = `qa-ga4-audit-${Date.now()}`;
const routeDir = new URL(`../src/app/${routeName}/`, import.meta.url);
await mkdir(routeDir);
let browser;
try {
  await writeFile(new URL('page.tsx', routeDir), `import { Suspense } from 'react'; import UIFixture from '../../../tests/ui-fixture'; export default function Page(){return <Suspense><UIFixture/></Suspense>}`);
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
  const context = await browser.newContext();
  let connected = false, configured = true, deny = false, statusFailure = false, submitted, connectBody;
  const misses = [], errors = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path === '/api/integrations/ga4/status') return route.fulfill({ status: statusFailure ? 503 : 200, json: statusFailure ? { error: 'Fixture unavailable' } : {
      configured, siteId: connected ? 'site-1' : null, connected,
      connection: connected ? { id: 'conn-1', propertyId: '123', propertyName: 'Studio analytics', hostname: 'studio.example', status: 'connected', lastError: null, lastSyncedAt: '2026-09-22T10:00:00Z' } : null,
    } });
    if (path === '/api/integrations/ga4/connect') { connectBody = request.postDataJSON(); return route.fulfill({ json: { siteId: 'site-1', url: `${base}/api/fixture-google` } }); }
    if (path === '/api/fixture-google') return route.fulfill({ contentType: 'text/html', body: `<script>window.opener.postMessage({type:'ghost-ga4-result',siteId:'site-1'${deny ? ",error:'denied'" : ''}},location.origin);window.close()</script>` });
    if (path === '/api/integrations/ga4/properties') return route.fulfill({ json: { siteDomain: 'studio.example', properties: [{ id: '123', name: 'Studio analytics', account: 'Studio', streams: [{ id: '456', name: 'Website', url: 'https://studio.example', matches: true }] }] } });
    if (path === '/api/integrations/ga4/select') { assert.equal(request.postDataJSON().siteId, 'site-1'); connected = true; return route.fulfill({ json: { ok: true } }); }
    if (path === '/api/dashboard/clients') return route.fulfill({ json: { clients: [] } });
    if (path === '/api/dashboard/audit-options') return route.fulfill({ json: { options: [{ id: 'deep', planId: 'deep_999', auditType: 'deep', title: 'Deep audit', description: 'Full website audit', available: true, canUse: true }] } });
    if (path === '/api/analyze') { submitted = request.postDataJSON(); return route.fulfill({ status: 500, json: { error: 'Fixture stopped before creating an audit' } }); }
    misses.push(path); return route.fulfill({ status: 501, json: { error: 'Unmapped fixture' } });
  });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  async function openAudit() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await page.goto(`${base}/${routeName}?screen=settings`, { waitUntil: 'networkidle' });
      if (response?.ok()) break;
      await page.waitForTimeout(500);
    }
    await page.getByRole('button', { name: 'New audit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/website url/i).fill('studio.example');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await dialog.getByRole('button', { name: /Deep audit/ }).waitFor();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await dialog.getByLabel(/primary.*goal/i).fill('More consultations');
    return dialog;
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 }); connected = false; deny = false;
    const dialog = await openAudit();
    await dialog.getByRole('button', { name: 'Connect Google Analytics', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Select GA4 Property' }).waitFor();
    assert.equal(connectBody.url, 'https://studio.example/'); assert.equal(connectBody.returnTo, 'audit');
    assert.equal(await dialog.getByLabel(/primary.*goal/i).inputValue(), 'More consultations');
    assert.equal(await dialog.getByRole('button', { name: 'Continue', exact: true }).isDisabled(), true);
    await dialog.getByRole('button', { name: /Studio analytics/ }).click();
    await dialog.getByRole('button', { name: 'Connect Property', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Select GA4 Property' }).waitFor({ state: 'detached' });
    await dialog.getByText('Studio analytics', { exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `/tmp/ghost-ga4-audit-${width}.png`, fullPage: true });
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start Ghost audit', exact: true }).click();
    await dialog.getByText('Fixture stopped before creating an audit', { exact: true }).waitFor();
    assert.equal(submitted.context.primaryGoal, 'More consultations');
    assert.equal(submitted.url, 'https://studio.example/');
    console.log(`PASS: connect, choose property, retain draft, review and submit at ${width}px`);
  }
  connected = false; deny = true;
  let dialog = await openAudit();
  await dialog.getByRole('button', { name: 'Connect Google Analytics', exact: true }).click();
  await dialog.getByText(/Google access was declined/).waitFor();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await dialog.getByRole('button', { name: 'Start Ghost audit', exact: true }).click();
  await dialog.getByText('Fixture stopped before creating an audit', { exact: true }).waitFor();
  console.log('PASS: declined Google access permits a website-only audit');
  configured = false; deny = false;
  dialog = await openAudit();
  await dialog.getByText(/not available on this installation/).waitFor();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await dialog.getByRole('button', { name: 'Start Ghost audit', exact: true }).click();
  await dialog.getByText('Fixture stopped before creating an audit', { exact: true }).waitFor();
  console.log('PASS: unavailable GA4 permits a website-only audit');
  configured = true; statusFailure = true;
  dialog = await openAudit(); await dialog.getByText('Fixture unavailable', { exact: true }).waitFor();
  assert.equal(await dialog.getByRole('button', { name: 'Continue', exact: true }).isEnabled(), true);
  assert.deepEqual(misses, []); assert.deepEqual(errors, []);
  console.log('PASS: GA4 status failures remain optional; no browser exceptions');
} finally { await browser?.close(); await rm(routeDir, { recursive: true, force: true }); }
