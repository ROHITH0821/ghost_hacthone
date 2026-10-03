import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAvailableAuditOptions, getSiteEntitlementForDomain } from "@/lib/db/entitlements";
import { findLatestBaselineMission } from "@/lib/db/comparisons";
import { canonicalizeDomain, upsertSiteForUser } from "@/lib/db/sites";
import { formatRescanExpiry } from "@/lib/plans";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { AUDIT_TYPE_LABELS, type AuditType } from "@/lib/plans";
import { PRIVATE_SHORT } from "@/lib/http/cache-headers";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  const options = await getAvailableAuditOptions({ userId, url });

  const hasRescan = options.some((o) => o.id === "rescan");
  let rescanMeta: {
    baselineMissionId: string | null;
    baselineLabel: string | null;
    rescansRemaining: number;
    rescansExpiresAt: string | null;
    siteId: string | null;
  } | null = null;

  if (hasRescan) {
    const domain = canonicalizeDomain(url);
    const site = await upsertSiteForUser({ userId, url });
    const ent = await getSiteEntitlementForDomain({ userId, domain });
    const baseline = await findLatestBaselineMission({ userId, siteId: site.id });
    rescanMeta = {
      baselineMissionId: baseline?.id ?? null,
      baselineLabel: baseline
        ? `${AUDIT_TYPE_LABELS[baseline.auditType as AuditType] ?? baseline.auditType} · ${baseline.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        : null,
      rescansRemaining: ent?.rescansRemaining ?? 0,
      rescansExpiresAt: ent?.rescansExpiresAt
        ? formatRescanExpiry(ent.rescansExpiresAt)
        : null,
      siteId: site.id,
    };
  }

  return NextResponse.json(
    { options, rescanMeta },
    { headers: { "Cache-Control": PRIVATE_SHORT } }
  );
}
