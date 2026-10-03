/** Shared Cache-Control helpers for private user-scoped API responses. */

export const NO_STORE = "private, no-store";

/** Short-lived browser/CDN cache for dashboard list GETs. */
export const PRIVATE_SHORT = "private, max-age=15, stale-while-revalidate=60";

/** Auth/session payload — safe to reuse briefly in the browser. */
export const PRIVATE_AUTH = "private, max-age=60, stale-while-revalidate=120";

/** Completed report payloads. */
export const PRIVATE_REPORT = "private, max-age=300";

export function withCache(
  data: unknown,
  cacheControl: string,
  init?: ResponseInit
): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", cacheControl);
  return Response.json(data, { ...init, headers });
}
