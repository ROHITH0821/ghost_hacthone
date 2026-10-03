import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  seal,
  unseal,
  digest,
  matchesDigest,
  propertyResource,
  host,
  AnalyticsError,
} from "@/lib/data-sources/ga4/security";

// Setup valid test encryption key (32 bytes base64)
const TEST_KEY = randomBytes(32).toString("base64");
process.env.GOOGLE_ANALYTICS_ENCRYPTION_KEY = TEST_KEY;
process.env.GOOGLE_ANALYTICS_CLIENT_ID = "test-client-id";
process.env.GOOGLE_ANALYTICS_CLIENT_SECRET = "test-client-secret";
process.env.GOOGLE_ANALYTICS_APP_ORIGIN = "http://localhost:3000";

test("GA4 Security - seal and unseal roundtrip", () => {
  const secret = "refresh_token_xyz_12345";
  const binding = "site_abc_123";

  const sealed = seal(secret, binding);
  assert.ok(typeof sealed === "string");
  assert.ok(sealed.startsWith("v1."));

  const unsealed = unseal(sealed, binding);
  assert.equal(unsealed, secret);
});

test("GA4 Security - unseal fails with mismatched binding context", () => {
  const secret = "secret-token";
  const sealed = seal(secret, "site-correct");

  assert.throws(
    () => unseal(sealed, "site-wrong"),
    (err: unknown) => {
      assert.ok(err instanceof AnalyticsError);
      assert.equal(err.code, "reconnect");
      return true;
    }
  );
});

test("GA4 Security - unseal fails with tampered ciphertext", () => {
  const secret = "secret-token";
  const binding = "site-1";
  const sealed = seal(secret, binding);

  const parts = sealed.split(".");
  // Corrupt the ciphertext payload
  parts[3] = Buffer.from("tampered_payload").toString("base64url");
  const tampered = parts.join(".");

  assert.throws(
    () => unseal(tampered, binding),
    (err: unknown) => {
      assert.ok(err instanceof AnalyticsError);
      return true;
    }
  );
});

test("GA4 Security - digest and matchesDigest", () => {
  const verifier = "pkce-verifier-string-123456789";
  const expectedHash = digest(verifier);

  assert.ok(matchesDigest(verifier, expectedHash));
  assert.equal(matchesDigest("wrong-verifier", expectedHash), false);
});

test("GA4 Security - propertyResource validation", () => {
  assert.equal(propertyResource("123456789"), "properties/123456789");
  assert.throws(() => propertyResource("invalid-id-with-letters"));
  assert.throws(() => propertyResource("../injection"));
});

test("GA4 Security - host normalization", () => {
  assert.equal(host("https://example.com/some/path"), "example.com");
  assert.equal(host("http://www.subdomain.test.co.uk"), "subdomain.test.co.uk");
  assert.equal(host("www.my-store.com"), "my-store.com");
});
