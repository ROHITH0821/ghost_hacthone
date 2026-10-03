import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { createClient, listClientsForUser } from "@/lib/db/clients";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { NO_STORE, PRIVATE_SHORT } from "@/lib/http/cache-headers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const agency = await isAgencyUser(userId);
  if (!agency) {
    return NextResponse.json({ error: "Agency subscription required" }, { status: 403 });
  }

  const clients = await listClientsForUser(userId);
  return NextResponse.json(
    { clients },
    { headers: { "Cache-Control": PRIVATE_SHORT } }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const agency = await isAgencyUser(userId);
  if (!agency) {
    return NextResponse.json({ error: "Agency subscription required" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const primaryDomain = typeof body.primaryDomain === "string" ? body.primaryDomain.trim() : "";

  if (!name || !primaryDomain) {
    return NextResponse.json({ error: "Name and domain are required" }, { status: 400 });
  }

  try {
    const client = await createClient({
      userId,
      name,
      primaryDomain,
      referenceId: typeof body.referenceId === "string" ? body.referenceId : undefined,
    });
    return NextResponse.json(
      { client },
      { headers: { "Cache-Control": NO_STORE } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create client";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
