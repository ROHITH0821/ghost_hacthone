import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { FIX_WORKFLOW_STATUSES, type FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { updateFixStatus } from "@/lib/db/fix-status";
import { resolveUserIdFromSession } from "@/lib/db/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as FixWorkflowStatus;

  if (!FIX_WORKFLOW_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const updated = await updateFixStatus({
    userId,
    fixId: id,
    status,
    note: typeof body.note === "string" ? body.note : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Fix not found" }, { status: 404 });
  }

  return NextResponse.json({ fix: updated });
}
