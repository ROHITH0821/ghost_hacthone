/**
 * URL helpers for the crawler. Ported and tidied from the takeover extractor,
 * plus an SSRF guard: the crawler takes user-supplied URLs, so it must refuse to
 * fetch private/internal/loopback addresses.
 */

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const SKIP_EXTENSIONS =
  /\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|tar|gz|rar|mp4|mp3|avi|mov|wmv|xml|css|js|ico|woff2?|ttf|eot)$/i;

/** Prepend https:// if the user passed a bare domain. */
export function normalizeInputUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getOrigin(url: string): string {
  return new URL(url).origin;
}

/** Canonical form for dedupe: drop the hash, trim a trailing slash (except root). */
export function normalizePageUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  let normalized = parsed.href;
  if (normalized.endsWith("/") && parsed.pathname !== "/") {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (SKIP_EXTENSIONS.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

// --- SSRF protection --------------------------------------------------------

/**
 * True if `ip` is a loopback, private, link-local, CGNAT, or otherwise
 * non-publicly-routable address. Malformed input is treated as unsafe.
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true; // unspecified, loopback
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]); // IPv4-mapped
    return false;
  }

  return true; // not a valid IP literal
}

/**
 * Throw if `url` is not safe to crawl: non-http(s) scheme, unresolvable host, or
 * a host that resolves to a private/internal address. Call this on the root URL
 * before crawling.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported URL scheme: ${parsed.protocol} (only http/https)`);
  }

  const host = parsed.hostname;
  let address = host;
  if (!isIP(host)) {
    try {
      address = (await lookup(host)).address;
    } catch {
      throw new Error(`Could not resolve host: ${host}`);
    }
  }

  if (isPrivateIp(address)) {
    throw new Error(`Refusing to crawl a private/internal address (${host} → ${address}).`);
  }
}
