import { NextRequest, NextResponse } from "next/server";
import { findConnectionsDueForSync, syncConnection } from "@/lib/data-sources/ga4/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYNC_LIMIT = 5;

/**
 * GET /api/cron/sync-analytics
 *
 * Background cron job: finds DataSourceConnections due for sync and refreshes
 * their GA4 snapshots. Runs every 6 hours (configured in vercel.json).
 *
 * Authorised by CRON_SECRET (same pattern as run-missions / finalize-missions).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await findConnectionsDueForSync(SYNC_LIMIT);
  if (connections.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const conn of connections) {
    try {
      await syncConnection(conn.id);
      results.push({ id: conn.id, ok: true });
      console.log(`[sync-analytics] synced connection=${conn.id} property=${conn.propertyName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ id: conn.id, ok: false, error: message });
      console.error(`[sync-analytics] failed connection=${conn.id}:`, message);
    }
  }

  return NextResponse.json({
    ok: true,
    synced: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
