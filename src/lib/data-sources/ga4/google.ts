import { AnalyticsError, config, propertyResource, SCOPE } from "./security";

const ADMIN = "https://analyticsadmin.googleapis.com/v1beta/";
const DATA = "https://analyticsdata.googleapis.com/v1beta/";
type Fetch = typeof fetch;
export interface DataReport {
  metricHeaders?: { name: string }[];
  dimensionHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  rowCount?: number;
  metadata?: {
    subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean; samplingMetadatas?: unknown[];
    dataTruncationReasons?: string[]; emptyReason?: string; currencyCode?: string;
    schemaRestrictionResponse?: { activeMetricRestrictions?: { metricName?: string }[] };
  };
}
export interface Property { id: string; name: string; account: string }
export interface Stream { id: string; name: string; url: string }

// No response bodies/URLs containing credentials are ever logged or propagated.
export class GoogleAnalyticsApi {
  constructor(private transport: Fetch = fetch, private delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))) {}
  private async request<T>(url: string, init: RequestInit, retry = true): Promise<T> {
    for (let attempt = 0; attempt < (retry ? 3 : 1); attempt++) {
      let response: Response;
      try { response = await this.transport(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(12_000) }); }
      catch { throw new AnalyticsError("temporary", 503); }
      if (response.ok) {
        try { return await response.json() as T; } catch { throw new AnalyticsError("temporary", 503); }
      }
      if ((response.status === 429 || response.status >= 500) && retry && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await this.delay(Math.min(3000, Math.max(250 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : 0)));
        continue;
      }
      if (url === "https://oauth2.googleapis.com/token") {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === "invalid_grant") throw new AnalyticsError("reconnect", 401);
        if (body.error === "invalid_client") throw new AnalyticsError("configuration", 503);
      }
      if (response.status === 401) throw new AnalyticsError("reconnect", 401);
      if (response.status === 403 || response.status === 404) throw new AnalyticsError("inaccessible", 403);
      if (response.status === 429) throw new AnalyticsError("quota", 429);
      throw new AnalyticsError("temporary", 503);
    }
    throw new AnalyticsError("temporary", 503);
  }
  async token(fields: Record<string, string>) {
    const c = config();
    const body = new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...fields });
    const result = await this.request<{ access_token?: string; refresh_token?: string; scope?: string }>(
      "https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }, false);
    if (!result.access_token || (result.scope && !result.scope.split(" ").includes(SCOPE))) throw new AnalyticsError("denied", 403);
    return { accessToken: result.access_token, refreshToken: result.refresh_token };
  }
  exchange(code: string, verifier: string) { return this.token({ code, code_verifier: verifier, redirect_uri: config().redirectUri, grant_type: "authorization_code" }); }
  refresh(refreshToken: string) { return this.token({ refresh_token: refreshToken, grant_type: "refresh_token" }); }
  async revoke(token: string) {
    // Google's revocation response may be empty; it is deliberately best effort.
    try { const r = await this.transport("https://oauth2.googleapis.com/revoke", { method: "POST", body: new URLSearchParams({ token }), signal: AbortSignal.timeout(5000) }); return r.ok; }
    catch { return false; }
  }
  private get<T>(path: string, token: string) { return this.request<T>(ADMIN + path, { headers: { Authorization: `Bearer ${token}` } }); }
  private async list<T>(path: string, key: string, token: string): Promise<T[]> {
    const out: T[] = []; let pageToken = "";
    for (let page = 0; page < 50; page++) {
      const query = new URLSearchParams({ pageSize: "200", ...(pageToken ? { pageToken } : {}) });
      const result = await this.get<Record<string, unknown>>(path + "?" + query, token);
      out.push(...(Array.isArray(result[key]) ? result[key] as T[] : []));
      pageToken = typeof result.nextPageToken === "string" ? result.nextPageToken : "";
      if (!pageToken) return out;
    }
    throw new AnalyticsError("quota", 429); // Never silently claim a partial list is complete.
  }
  async properties(token: string): Promise<Property[]> {
    const accounts = await this.list<{ displayName?: string; propertySummaries?: { property: string; displayName?: string }[] }>("accountSummaries", "accountSummaries", token);
    return accounts.flatMap(a => (a.propertySummaries ?? []).filter(p => /^properties\/\d+$/.test(p.property)).map(p => ({ id: p.property.split("/")[1], name: p.displayName || p.property, account: a.displayName || "Analytics account" })));
  }
  async property(id: string, token: string) {
    return this.get<{ displayName?: string; timeZone?: string; currencyCode?: string }>(propertyResource(id), token);
  }
  async streams(id: string, token: string): Promise<Stream[]> {
    const list = await this.list<{ name: string; displayName?: string; type: string; webStreamData?: { defaultUri?: string } }>(propertyResource(id) + "/dataStreams", "dataStreams", token);
    return list.filter(s => s.type === "WEB_DATA_STREAM" && /^properties\/\d+\/dataStreams\/\d+$/.test(s.name)).map(s => ({ id: s.name.split("/")[3], name: s.displayName || s.name, url: s.webStreamData?.defaultUri || "" }));
  }
  keyEvents(id: string, token: string) { return this.list<{ eventName: string }>(propertyResource(id) + "/keyEvents", "keyEvents", token); }
  report(id: string, token: string, body: unknown) {
    return this.request<DataReport>(DATA + propertyResource(id) + ":runReport", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
}
