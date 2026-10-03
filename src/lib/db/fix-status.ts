import { assertMissionLease } from "@/lib/missions/lease";
import type { GhostReport } from "@/lib/types";
import { db } from "@/lib/db";
import { getSiteEntitlementForDomain } from "@/lib/db/entitlements";
import { buildRescanComparison } from "@/lib/db/comparisons";
import {
  FIX_CONTENT_PREVIEW_CHARS,
  type FixCounts,
  type FixStatusRow,
  type FixWorkflowStatus,
} from "@/lib/db/fix-workflow";
import { isUserApproved } from "@/lib/db/users";
import { PLAN_IDS, isPaidPlan, type PlanId } from "@/lib/plans";

export type { FixCounts, FixStatusRow, FixWorkflowStatus } from "@/lib/db/fix-workflow";
export { FIX_WORKFLOW_STATUSES } from "@/lib/db/fix-workflow";

function leakSourceKey(leakId: string) {
  return `leak:${leakId}`;
}

function fixSourceKey(fixId: string) {
  return `kit:${fixId}`;
}

async function hasPaidSiteAccess(userId: string, domain: string) {
  if (await isUserApproved(userId)) return true;
  const ent = await getSiteEntitlementForDomain({ userId, domain });
  return Boolean(ent && isPaidPlan(ent.planId as PlanId));
}

export async function seedFixStatusesFromReport(input: {
  userId: string;
  siteId: string;
  missionId: string;
  domain: string;
  report: GhostReport;
}) {
  const paid = await hasPaidSiteAccess(input.userId, input.domain);
  if (!paid) return;

  for (const leak of input.report.leaks) {
    const sourceKey = leakSourceKey(leak.id);
    const fixContent = leak.fix?.content ?? leak.howToFix ?? "";
    const shopperQuote = leak.whyCustomersLeave?.slice(0, 280) ?? null;

    await db.fixStatus.upsert({
      where: {
        missionId_sourceKey: {
          missionId: input.missionId,
          sourceKey,
        },
      },
      create: {
        userId: input.userId,
        siteId: input.siteId,
        missionId: input.missionId,
        sourceKey,
        leakId: leak.id,
        kind: "leak",
        title: leak.title,
        severity: leak.severity,
        category: leak.category,
        pageUrl: null,
        shopperQuote,
        fixContent: fixContent || null,
        status: "recommended",
      },
      update: {
        title: leak.title,
        severity: leak.severity,
        category: leak.category,
        shopperQuote,
        fixContent: fixContent || null,
      },
    });
  }

  for (const fix of input.report.fixes) {
    const sourceKey = fixSourceKey(fix.id);
    await db.fixStatus.upsert({
      where: {
        missionId_sourceKey: {
          missionId: input.missionId,
          sourceKey,
        },
      },
      create: {
        userId: input.userId,
        siteId: input.siteId,
        missionId: input.missionId,
        sourceKey,
        fixId: fix.id,
        kind: "growth_kit",
        title: fix.title,
        severity: null,
        category: fix.category,
        pageUrl: null,
        shopperQuote: fix.description?.slice(0, 280) ?? null,
        fixContent: fix.content,
        status: "recommended",
      },
      update: {
        title: fix.title,
        category: fix.category,
        shopperQuote: fix.description?.slice(0, 280) ?? null,
        fixContent: fix.content,
      },
    });
  }
}

export async function getFixesForUser(input: {
  userId: string;
  siteId?: string;
  status?: FixWorkflowStatus;
  severity?: string;
  category?: string;
  from?: Date;
  to?: Date;
}): Promise<FixStatusRow[]> {
  const missionDateFilter =
    input.from || input.to
      ? {
          createdAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : undefined;

  const rows = await db.fixStatus.findMany({
    where: {
      OR: [{ userId: input.userId }, { site: { userId: input.userId } }],
      ...(input.siteId ? { siteId: input.siteId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(missionDateFilter
        ? {
            mission: missionDateFilter,
          }
        : {}),
    },
    include: {
      site: { select: { canonicalDomain: true } },
      mission: { select: { createdAt: true, domain: true } },
    },
    orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
  });

  return rows.map((row) => {
    const full = row.fixContent;
    const truncated =
      full != null && full.length > FIX_CONTENT_PREVIEW_CHARS;

    return {
      ...row,
      // Ship only what the card renders; the copy action fetches the rest.
      fixContent: truncated
        ? full!.slice(0, FIX_CONTENT_PREVIEW_CHARS)
        : full,
      fixContentTruncated: truncated,
      status: row.status as FixWorkflowStatus,
      siteDomain: row.site.canonicalDomain,
      missionDomain: row.mission.domain,
      missionCreatedAt: row.mission.createdAt,
    };
  });
}

/** Full, untruncated fix content for a single row the user owns. */
export async function getFixContentForUser(input: {
  userId: string;
  fixId: string;
}): Promise<string | null> {
  const row = await db.fixStatus.findFirst({
    where: { id: input.fixId, userId: input.userId },
    select: { fixContent: true },
  });
  return row?.fixContent ?? null;
}

export async function bulkUpdateFixStatus(input: {
  userId: string;
  fixIds: string[];
  status: FixWorkflowStatus;
}) {
  const uniqueIds = [...new Set(input.fixIds)];
  if (uniqueIds.length === 0) return [];

  const existing = await db.fixStatus.findMany({
    where: { userId: input.userId, id: { in: uniqueIds } },
  });
  if (existing.length !== uniqueIds.length) {
    throw new Error("One or more fixes not found");
  }

  const now = new Date();
  await db.$transaction(
    existing.map((fix) => {
      const data: {
        status: string;
        implementedAt?: Date | null;
        verifiedAt?: Date | null;
      } = { status: input.status };

      if (
        input.status === "implemented" &&
        fix.status !== "implemented" &&
        fix.status !== "verified"
      ) {
        data.implementedAt = now;
      }
      if (input.status === "verified" && fix.status !== "verified") {
        data.verifiedAt = now;
        if (!fix.implementedAt) data.implementedAt = now;
      }
      if (input.status === "recommended" || input.status === "planned") {
        data.implementedAt = null;
        data.verifiedAt = null;
      }

      return db.fixStatus.update({
        where: { id: fix.id },
        data,
      });
    })
  );

  return getFixesForUser({ userId: input.userId });
}

export async function updateFixStatus(input: {
  userId: string;
  fixId: string;
  status: FixWorkflowStatus;
  note?: string | null;
}) {
  const existing = await db.fixStatus.findFirst({
    where: { id: input.fixId, userId: input.userId },
  });
  if (!existing) return null;

  const now = new Date();
  const data: {
    status: string;
    note?: string | null;
    implementedAt?: Date | null;
    verifiedAt?: Date | null;
  } = {
    status: input.status,
    note: input.note ?? existing.note,
  };

  if (input.status === "implemented" && existing.status !== "implemented" && existing.status !== "verified") {
    data.implementedAt = now;
  }
  if (input.status === "verified" && existing.status !== "verified") {
    data.verifiedAt = now;
    if (!existing.implementedAt) data.implementedAt = now;
  }
  if (input.status === "recommended" || input.status === "planned") {
    data.implementedAt = null;
    data.verifiedAt = null;
  }

  return db.fixStatus.update({
    where: { id: input.fixId },
    data,
  });
}

export async function getFixCountsForUser(userId: string): Promise<FixCounts> {
  const [implemented, verified, total] = await Promise.all([
    db.fixStatus.count({
      where: { userId, status: { in: ["implemented", "verified"] } },
    }),
    db.fixStatus.count({ where: { userId, status: "verified" } }),
    db.fixStatus.count({ where: { userId } }),
  ]);

  return { implemented, verified, total };
}

export async function getImplementedFixesForSite(userId: string, siteId: string) {
  return getFixesForUser({ userId, siteId, status: "implemented" });
}

export async function verifyFixesFromRescan(input: {
  userId: string;
  rescanMissionId: string;
  baselineMissionId: string;
  selectedFixIds?: string[];
}) {
  const [baselineMission, rescanMission] = await Promise.all([
    db.mission.findFirst({
      where: { id: input.baselineMissionId, userId: input.userId, status: "complete" },
    }),
    db.mission.findFirst({
      where: { id: input.rescanMissionId, userId: input.userId, status: "complete" },
    }),
  ]);

  if (!baselineMission?.report || !rescanMission?.report) return;

  const baselineReport = baselineMission.report as unknown as GhostReport;
  const rescanReport = rescanMission.report as unknown as GhostReport;
  const comparison = buildRescanComparison(baselineReport, rescanReport, []);

  const resolvedTitles = new Set(
    comparison.resolved.map((l) => l.title.toLowerCase().trim())
  );

  const fixes = await db.fixStatus.findMany({
    where: {
      userId: input.userId,
      missionId: input.baselineMissionId,
      status: "implemented",
      ...(input.selectedFixIds?.length ? { id: { in: input.selectedFixIds } } : {}),
    },
  });

  const now = new Date();
  for (const fix of fixes) {
    if (resolvedTitles.has(fix.title.toLowerCase().trim())) {
      await db.fixStatus.update({
        where: { id: fix.id },
        data: {
          status: "verified",
          verifiedAt: now,
          verifiedByMissionId: input.rescanMissionId,
        },
      });
    }
  }
}

export async function handleMissionCompleteSideEffects(missionId: string, report: GhostReport) {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!mission?.userId || !mission.user) return;

  if (mission.siteId) {
    await seedFixStatusesFromReport({
      userId: mission.userId,
      siteId: mission.siteId,
      missionId,
      domain: mission.domain,
      report,
    });
  }

  if (
    mission.auditType === "rescan" &&
    mission.baselineMissionId &&
    mission.siteId
  ) {
    const context = (mission.context ?? {}) as { selectedFixIds?: string[] };
    await verifyFixesFromRescan({
      userId: mission.userId,
      rescanMissionId: missionId,
      baselineMissionId: mission.baselineMissionId,
      selectedFixIds: context.selectedFixIds,
    });
  }

  // Email is sent after PDF upload via notifyAuditCompleteEmail — not here —
  // so the message can attach the stored report PDF.
}

/** Send audit-complete email once per mission, attaching an already-uploaded PDF when available. */
export async function notifyAuditCompleteEmail(
  missionId: string,
  report: GhostReport,
  pdfUrl?: string | null,
): Promise<void> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!mission?.userId || !mission.user?.email) return;

  const alreadySent = await db.notificationLog.findUnique({
    where: {
      userId_type_refId: {
        userId: mission.userId,
        type: "audit_complete",
        refId: missionId,
      },
    },
  });
  if (alreadySent) return;

  const criticalCount = report.leaks.filter((l) => l.severity === "critical").length;
  await assertMissionLease();

  const resolvedPdfUrl = pdfUrl ?? mission.pdfUrl;
  const { sendAuditCompleteEmail } = await import("@/lib/auth/resend");
  const result = await sendAuditCompleteEmail({
    to: mission.user.email,
    domain: mission.domain,
    missionId,
    score: report.score,
    criticalCount,
    pdfUrl: resolvedPdfUrl,
  });
  if (!result.success) throw new Error("Audit completion email delivery failed");
  await assertMissionLease();
  // A database outage must stay retryable; only a confirmed duplicate is successful.
  await db.notificationLog.upsert({
    where: { userId_type_refId: { userId: mission.userId, type: "audit_complete", refId: missionId } },
    create: { userId: mission.userId, type: "audit_complete", refId: missionId },
    update: {},
  });
}

export async function userHasAnyFixes(userId: string) {
  const count = await db.fixStatus.count({ where: { userId } });
  return count > 0;
}
