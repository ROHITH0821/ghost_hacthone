import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStructuredWithTimeout, LlmTimeoutError } from '../src/lib/ghost-engine/util';
import { dispatchMission } from '../src/lib/missions/dispatch';
import { APIConnectionError, APIConnectionTimeoutError, APIUserAbortError } from '@anthropic-ai/sdk';

test('actual SDK connection errors retry, while caller aborts do not', async () => {
  for (const error of [new APIConnectionError({}), new APIConnectionTimeoutError()]) {
    let attempts = 0;
    assert.equal(await parseStructuredWithTimeout('connection', async () => {
      if (++attempts === 1) throw error;
      return 'ok';
    }, { sleep: async () => {} }), 'ok');
    assert.equal(attempts, 2);
  }
  let attempts = 0;
  await assert.rejects(parseStructuredWithTimeout('cancelled', async () => { attempts++; throw new APIUserAbortError(); }));
  assert.equal(attempts, 1);
});

test('LLM timeout aborts the request, backs off and succeeds without nested retries', async () => {
  let attempts = 0, aborts = 0;
  const delays: number[] = [];
  const result = await parseStructuredWithTimeout('test', signal => {
    attempts++;
    if (attempts === 2) return Promise.resolve('ok');
    return new Promise<string>((_, reject) => signal.addEventListener('abort', () => { aborts++; reject(signal.reason); }));
  }, { timeoutMs: 10, sleep: async ms => { delays.push(ms); }, random: () => 0 });
  assert.equal(result, 'ok'); assert.equal(attempts, 2); assert.equal(aborts, 1); assert.deepEqual(delays, [1000]);
});

test('LLM timeouts exhaust exactly three attempts and abort every timed-out request', async () => {
  let attempts = 0, aborts = 0;
  const delays: number[] = [];
  await assert.rejects(parseStructuredWithTimeout('test', signal => {
    attempts++;
    return new Promise((_, reject) => signal.addEventListener('abort', () => { aborts++; reject(signal.reason); }));
  }, { timeoutMs: 5, sleep: async ms => { delays.push(ms); }, random: () => 0 }), LlmTimeoutError);
  assert.equal(attempts, 3); assert.equal(aborts, 3); assert.deepEqual(delays, [1000, 2000]);
});

test('rate limiting respects bounded Retry-After; terminal errors do not retry', async () => {
  let attempts = 0;
  const delays: number[] = [];
  await parseStructuredWithTimeout('rate-limit', async () => {
    if (++attempts < 3) throw Object.assign(new Error('rate limit'), { status: 429, headers: new Headers({ 'retry-after': attempts === 1 ? '4' : '999' }) });
    return true;
  }, { sleep: async ms => { delays.push(ms); }, random: () => 0 });
  assert.deepEqual(delays, [4000, 60000]);
  attempts = 0;
  await assert.rejects(parseStructuredWithTimeout('terminal', async () => { attempts++; throw Object.assign(new Error('bad request'), { status: 400 }); }), /bad request/);
  assert.equal(attempts, 1);
});

test('dispatch awaits authenticated acceptance, encodes IDs, and reports failures safely', async () => {
  const oldUrl = process.env.NEXT_PUBLIC_APP_URL, oldSecret = process.env.CRON_SECRET;
  process.env.NEXT_PUBLIC_APP_URL = 'https://ghost.example'; process.env.CRON_SECRET = 'test-secret';
  try {
    const transport: typeof fetch = async (url, init) => {
      assert.equal(String(url), 'https://ghost.example/api/missions/a%2Fb/run?dispatch=1');
      assert.equal(init?.method, 'POST'); assert.equal(init?.redirect, 'error');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-secret');
      assert.ok(init?.signal);
      return Response.json({ ok: true });
    };
    assert.equal((await dispatchMission('a/b', 'run', transport)).ok, true);
    assert.deepEqual(await dispatchMission('a', 'finalize', async () => new Response('', { status: 503 })), { ok: false, errors: ['dispatch_http_503'] });
    assert.deepEqual(await dispatchMission('a', 'run', async () => { throw new Error('private URL and secret'); }), { ok: false, errors: ['dispatch_transport_failure'] });
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = oldSecret;
  }
});
