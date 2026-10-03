import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { getFixHandoff, publishFixHandoff, revokeFixHandoff } from "@/lib/db/fix-shares";
import { HandoffInputSchema } from "@/lib/fixes/handoff";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;
  const data = await getFixHandoff(auth.userId, (await params).id);
  return NextResponse.json(data ?? { error: "Fix not found" }, { status: data ? 200 : 404, headers });
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Request origin could not be verified" }, { status: 403, headers });
  const body = await request.text();
  if (body.length > 50000) return NextResponse.json({ error: "Handoff is too large" }, { status: 413, headers });
  let value: unknown;
  try { value = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = HandoffInputSchema.safeParse(value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the handoff fields" }, { status: 400, headers });
  const data = await publishFixHandoff(auth.userId, (await params).id, parsed.data);
  return NextResponse.json(data ?? { error: "Fix not found" }, { status: data ? 200 : 404, headers });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Request origin could not be verified" }, { status: 403, headers });
  const revoked = await revokeFixHandoff(auth.userId, (await params).id);
  return NextResponse.json(revoked ? { ok: true } : { error: "Fix not found" }, { status: revoked ? 200 : 404, headers });
}
