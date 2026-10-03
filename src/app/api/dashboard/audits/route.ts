import { NextRequest, NextResponse } from "next/server";
import { listClientsForUser } from "@/lib/db/clients";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { requireDashboardUser } from "@/lib/dashboard/require-shell";
import { auditsFiltersToQuery, parseAuditsFilters } from "@/lib/dashboard/filters";
import { getAuditsForUser } from "@/lib/db/missions";

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
