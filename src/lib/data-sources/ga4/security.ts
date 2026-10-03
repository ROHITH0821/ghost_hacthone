import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export class AnalyticsError extends Error {
  constructor(public code: keyof typeof errors, public status = 400) { super(errors[code]); }
}
export const errors = {
  configuration: "Google Analytics is not configured on this Ghost installation yet.",
  unauthorized: "Sign in to Ghost to manage this connection.",
  forbidden: "This website or connection is unavailable.",
  origin: "This request could not be verified. Reload Settings and try again.",
  invalid_state: "This connection request expired or was already used. Start again from Settings.",
  denied: "Google access was declined. Your website audits still work normally.",
  reconnect: "Google access expired or was revoked. Reconnect Google Analytics.",
  no_refresh_token: "Google did not provide offline access. Please reconnect and approve access.",
  inaccessible: "This Analytics property is unavailable or your Google account no longer has access.",
  invalid_property: "Choose an accessible GA4 property and a web stream for this website.",
  quota: "Google's reporting limit was reached. Ghost will retry later.",
  temporary: "Analytics is temporarily unavailable. Your website audits are unaffected.",
  busy: "A synchronization is running or was attempted recently. Please try again later.",
} as const;
export function safeError(error: unknown): AnalyticsError {
  return error instanceof AnalyticsError ? error : new AnalyticsError("temporary", 503);
}
export function config() {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;
  const origin = process.env.GOOGLE_ANALYTICS_APP_ORIGIN;
  if (!clientId || !clientSecret || !origin) throw new AnalyticsError("configuration", 503);
  let url: URL;
  try { url = new URL(origin); } catch { throw new AnalyticsError("configuration", 503); }
  if (url.origin !== origin || url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost" && url.protocol === "http:"))) {
    throw new AnalyticsError("configuration", 503);
  }
  encryptionKey();
  return { clientId, clientSecret, origin, redirectUri: `${origin}/api/integrations/ga4/callback` };
}
export function configured() { try { config(); return true; } catch { return false; } }
function encryptionKey() {
  const raw = process.env.GOOGLE_ANALYTICS_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw) throw new AnalyticsError("configuration", 503);
  return key;
}
export function seal(secret: string, binding: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(binding));
  const bytes = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(".");
}
export function unseal(value: string, binding: string): string {
  try {
    const [version, iv, tag, bytes, extra] = value.split(".");
    if (version !== "v1" || extra || !bytes) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(binding));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(bytes, "base64url")), decipher.final()]).toString("utf8");
  } catch { throw new AnalyticsError("reconnect", 401); }
}
export const randomSecret = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("base64url");
export function matchesDigest(value: string, expected: string) {
  const actual = Buffer.from(digest(value)); const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}
export function assertOrigin(origin: string | null) {
  if (origin !== config().origin) throw new AnalyticsError("origin", 403);
}
export function propertyResource(id: string) {
  if (!/^\d{1,20}$/.test(id)) throw new AnalyticsError("invalid_property");
  return `properties/${id}`;
}
export function host(value: string) {
  try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}
export function authorizationUrl(state: string, verifier: string) {
  const c = config();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: c.clientId, redirect_uri: c.redirectUri,
    response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent",
    state, code_challenge: digest(verifier), code_challenge_method: "S256" }).toString();
  return url.toString();
}
