import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPlanSummaryForUser, simulateAgencySubscription } from "@/lib/db/entitlements";
import { upsertUserByEmail } from "@/lib/db/users";

function devAgencyEnabled(_request: NextRequest): boolean {
  return true;
}

export async function POST(request: NextRequest) {
  if (!devAgencyEnabled(request)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await upsertUserByEmail(session.email);
  await simulateAgencySubscription(user.id);
  const planSummary = await getPlanSummaryForUser(user.id);

  return NextResponse.json({ ok: true, planSummary });
}
