import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import {
  getOwnedPurchasesForUser,
  getPlanSummaryForUser,
} from "@/lib/db/entitlements";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;
  const [planSummary, purchases] = await Promise.all([
    getPlanSummaryForUser(userId),
    getOwnedPurchasesForUser(userId),
  ]);

  return NextResponse.json({ planSummary, purchases });
}
