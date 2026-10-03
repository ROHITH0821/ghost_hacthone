import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { FIX_WORKFLOW_STATUSES, type FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { bulkUpdateFixStatus } from "@/lib/db/fix-status";
import { resolveUserIdFromSession } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const fixIds = Array.isArray(body.fixIds) ? body.fixIds.filter((id: unknown) => typeof id === "string") : [];
  const status = body.status as FixWorkflowStatus;

  if (!fixIds.length) {
    return NextResponse.json({ error: "No fixes selected" }, { status: 400 });
  }
  if (!FIX_WORKFLOW_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    const fixes = await bulkUpdateFixStatus({ userId, fixIds, status });
    const updated = fixes.filter((f) => fixIds.includes(f.id));
    return NextResponse.json({ fixes: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
