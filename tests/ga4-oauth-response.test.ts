import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { auditOAuthCompletion } from "../src/lib/data-sources/ga4/oauth-response";

test("audit OAuth completion posts only the result to the exact app origin and closes", () => {
  const html = auditOAuthCompletion({ siteId: "site-1" }, "https://ghost.example", "test-nonce");
  assert.match(html, /nonce="test-nonce"/);
  const calls: unknown[] = [];
  vm.runInNewContext(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1], {
    window: { opener: { postMessage: (message: unknown, origin: string) => calls.push(JSON.parse(JSON.stringify({ message, origin }))) }, close: () => calls.push("closed") },
  });
  assert.deepEqual(calls, [{ message: { type: "ghost-ga4-result", siteId: "site-1" }, origin: "https://ghost.example" }, "closed"]);
  assert.doesNotMatch(html, /accessToken|refreshToken|code=/);
});

test("audit OAuth completion escapes script delimiters and tolerates a closed opener", () => {
  const html = auditOAuthCompletion({ siteId: '</script><script>alert(1)</script>', error: "denied" }, "https://ghost.example", "nonce");
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.doesNotThrow(() => vm.runInNewContext(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1], { window: { opener: null } }));
});
