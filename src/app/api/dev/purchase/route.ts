import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPlanSummaryForUser, simulatePurchase } from "@/lib/db/entitlements";
import { upsertUserByEmail } from "@/lib/db/users";
import { PLAN_IDS, type PlanId } from "@/lib/plans";

function devPurchaseEnabled(_request: NextRequest): boolean {
  // Early access: simulated checkout (same as local) until real payments ship.
  return true;
}

export async function POST(request: NextRequest) {
  if (!devPurchaseEnabled(request)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const planId = body.planId as PlanId;
  const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;

  if (planId !== PLAN_IDS.oneSite499 && planId !== PLAN_IDS.deep999) {
    return NextResponse.json({ error: "Invalid planId for purchase" }, { status: 400 });
  }

  const user = await upsertUserByEmail(session.email);
  await simulatePurchase({
    userId: user.id,
    planId,
    domain: domain || undefined,
  });
  const planSummary = await getPlanSummaryForUser(user.id);

  return NextResponse.json({ ok: true, planSummary });
}
