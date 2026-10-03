import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  FIX_WORKFLOW_STATUSES,
  type FixWorkflowStatus,
} from "@/lib/db/fix-workflow";
import { getFixesForUser } from "@/lib/db/fix-status";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { PRIVATE_SHORT } from "@/lib/http/cache-headers";

function parseDateParam(value: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const params = request.nextUrl.searchParams;
  const siteId = params.get("siteId") ?? undefined;
  const statusParam = params.get("status");
  const severity = params.get("severity") ?? undefined;
  const category = params.get("category") ?? undefined;
  const from = parseDateParam(params.get("from"));
  const toRaw = parseDateParam(params.get("to"));
  const to = toRaw ? endOfDay(toRaw) : undefined;

  const status =
    statusParam && FIX_WORKFLOW_STATUSES.includes(statusParam as FixWorkflowStatus)
      ? (statusParam as FixWorkflowStatus)
      : undefined;

  const fixes = await getFixesForUser({
    userId,
    siteId,
    status,
    severity,
    category,
    from,
    to,
  });

  return NextResponse.json(
    { fixes },
    { headers: { "Cache-Control": PRIVATE_SHORT } }
  );
}
