import { NextResponse } from "next/server";
import { getWorkspaceForUser, isAgencyUser } from "@/lib/db/agency-workspace";
import { getBrandProfileForUser } from "@/lib/db/brand-profile";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  if (!(await isAgencyUser(auth.userId))) {
    return NextResponse.json({ error: "Agency required" }, { status: 403 });
  }

  const [workspace, profile] = await Promise.all([
    getWorkspaceForUser(auth.userId),
    getBrandProfileForUser(auth.userId),
  ]);

  return NextResponse.json({
    workspaceName: workspace?.name ?? "My Agency",
    profile,
  });
}
