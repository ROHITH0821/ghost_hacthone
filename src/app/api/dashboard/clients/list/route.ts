import { NextResponse } from "next/server";
import { listClientsForUser } from "@/lib/db/clients";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  if (!(await isAgencyUser(auth.userId))) {
    return NextResponse.json({ error: "Agency required" }, { status: 403 });
  }

  const clients = await listClientsForUser(auth.userId);
  return NextResponse.json({ clients });
}
