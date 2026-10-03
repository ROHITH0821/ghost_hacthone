import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { getSitesDashboardForUser } from "@/lib/db/sites";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const sites = await getSitesDashboardForUser({
    userId: auth.userId,
    includeArchived: true,
  });

  return NextResponse.json({ sites });
}
