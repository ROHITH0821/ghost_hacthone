import { NextRequest, NextResponse } from "next/server";
import { listClientsForUser } from "@/lib/db/clients";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { auditsFiltersToQuery, parseAuditsFilters } from "@/lib/dashboard/filters";
import { deleteAuditsForUser, getAuditsForUser } from "@/lib/db/missions";
import { removeMissionReportFiles } from "@/lib/storage/supabase";
import { copy } from "@/lib/copy";

export async function GET(request: NextRequest) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseAuditsFilters(params);
  const query = auditsFiltersToQuery(filters);

  const [audits, agency] = await Promise.all([
    getAuditsForUser({ userId, ...query, limit: 200 }),
    isAgencyUser(userId),
  ]);

  const clients = agency ? await listClientsForUser(userId) : [];

  return NextResponse.json({
    audits,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      primaryDomain: c.primaryDomain,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireDashboardUser();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (ids.length === 0 || ids.length > 50) {
    return NextResponse.json({ error: copy.dashboardBulk.deleteFailed }, { status: 400 });
  }

  const { deleted } = await deleteAuditsForUser({
    userId: auth.userId,
    missionIds: ids,
  });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  await Promise.all(
    deleted.map((mission) =>
      removeMissionReportFiles({ missionId: mission.id, domain: mission.domain }),
    ),
  );

  return NextResponse.json({ deleted: deleted.length });
}
