import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  archiveClient,
  getClientForUser,
  unarchiveClient,
  updateClient,
} from "@/lib/db/clients";
import { resolveUserIdFromSession } from "@/lib/db/users";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const client = await getClientForUser(userId, id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const body = await request.json();

  try {
    const client = await updateClient({
      userId,
      clientId: id,
      name: typeof body.name === "string" ? body.name : undefined,
      referenceId: body.referenceId,
      defaults: body.defaults,
    });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const body = await request.json();
  const action = body.action as "archive" | "unarchive";

  if (action === "archive") {
    await archiveClient(userId, id);
  } else if (action === "unarchive") {
    await unarchiveClient(userId, id);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
