import { NextRequest, NextResponse } from "next/server";
import { PLAN_IDS, type PlanId } from "@/lib/plans";
import { setDevEntitlement } from "@/lib/db/entitlements";
import { upsertUserByEmail } from "@/lib/db/users";

function devEntitlementsEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const key = process.env.DEV_ENTITLEMENT_KEY;
  if (!key) return false;
  return request.headers.get("x-dev-entitlement-key") === key;
}

export async function POST(request: NextRequest) {
  if (!devEntitlementsEnabled(request)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const planId = body.planId as PlanId;
  const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;

  if (!email || !planId) {
    return NextResponse.json({ error: "email and planId required" }, { status: 400 });
  }

  if (!Object.values(PLAN_IDS).includes(planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const user = await upsertUserByEmail(email);
  const entitlement = await setDevEntitlement({
    userId: user.id,
    planId,
    domain: domain || undefined,
    rescansRemaining: body.rescansRemaining,
    rescansExpiresAt: body.rescansExpiresAt
      ? new Date(body.rescansExpiresAt)
      : undefined,
  });

  return NextResponse.json({ ok: true, entitlement });
}
