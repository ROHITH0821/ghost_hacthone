import {
  formatRescanExpiry,
  PLAN_IDS,
  siteFaviconUrl,
  type PlanId,
} from "@/lib/plans";
import { getAccountEntitlements } from "@/lib/db/entitlements";
import { db } from "@/lib/db";
import { extractDomain } from "@/lib/utils";

export function canonicalizeDomain(input: string): string {
  return extractDomain(input).toLowerCase();
}

export async function upsertSiteForUser(input: {
  userId: string;
  url: string;
  displayName?: string | null;
}) {
  const canonicalDomain = canonicalizeDomain(input.url);

  return db.site.upsert({
    where: {
      userId_canonicalDomain: {
        userId: input.userId,
        canonicalDomain,
      },
    },
    create: {
      userId: input.userId,
      canonicalDomain,
      displayName: input.displayName ?? null,
    },
    update: {
      displayName: input.displayName ?? undefined,
      archivedAt: null,
    },
  });
}

export async function getSitesForUser(userId: string) {
  return db.site.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSiteForUserDomain(input: {
  userId: string;
  domain: string;
}) {
  const canonicalDomain = canonicalizeDomain(input.domain);
  return db.site.findUnique({
    where: {
      userId_canonicalDomain: {
        userId: input.userId,
        canonicalDomain,
      },
    },
  });
}

export async function archiveSiteForUser(input: {
  userId: string;
  siteId: string;
}) {
  return db.site.updateMany({
    where: { id: input.siteId, userId: input.userId },
    data: { archivedAt: new Date() },
  });
}

export async function unarchiveSiteForUser(input: {
  userId: string;
  siteId: string;
}) {
  return db.site.updateMany({
    where: { id: input.siteId, userId: input.userId },
    data: { archivedAt: null },
  });
}

export type SiteDashboardRow = {
  id: string;
  canonicalDomain: string;
  displayName: string | null;
  archivedAt: Date | null;
  faviconUrl: string;
  entitlementLabel: string;
  planId: PlanId | null;
  latestScore: number | null;
  scoreDelta: number | null;
  unresolvedCount: number;
  lastScannedAt: Date | null;
  latestMissionId: string | null;
  latestMissionStatus: string | null;
  hasPdf: boolean;
  rescansRemaining: number;
  rescansExpiresAt: Date | null;
};

function getSiteEntitlementLabel(
  entitlements: Awaited<ReturnType<typeof getAccountEntitlements>>,
  domain: string
): { label: string; planId: PlanId | null; rescansRemaining: number; rescansExpiresAt: Date | null } {
  const siteEnt = entitlements.find(
    (e) =>
      e.site?.canonicalDomain === domain ||
      (e.boundUrl ? canonicalizeDomain(e.boundUrl) === domain : false)
  );

  if (!siteEnt) {
    return { label: "Free preview", planId: PLAN_IDS.free, rescansRemaining: 0, rescansExpiresAt: null };
  }

  const planId = siteEnt.planId as PlanId;

  if (planId === PLAN_IDS.deep999) {
    if (siteEnt.rescansRemaining > 0 && siteEnt.rescansExpiresAt) {
      return {
        label: `Re-scan available until ${formatRescanExpiry(siteEnt.rescansExpiresAt)}`,
        planId,
        rescansRemaining: siteEnt.rescansRemaining,
        rescansExpiresAt: siteEnt.rescansExpiresAt,
      };
    }
    if (siteEnt.rescansRemaining > 0 && !siteEnt.rescansExpiresAt) {
      return {
        label: "1 re-scan included — starts after first deep audit",
        planId,
        rescansRemaining: siteEnt.rescansRemaining,
        rescansExpiresAt: null,
      };
    }
    return {
      label: "Deep report owned",
      planId,
      rescansRemaining: siteEnt.rescansRemaining,
      rescansExpiresAt: siteEnt.rescansExpiresAt,
    };
  }

  if (planId === PLAN_IDS.oneSite499) {
    return {
      label: "Standard report owned",
      planId,
      rescansRemaining: 0,
      rescansExpiresAt: null,
    };
  }

  return {
    label: "Free preview",
    planId: PLAN_IDS.free,
    rescansRemaining: 0,
    rescansExpiresAt: null,
  };
}

export async function getSitesDashboardForUser(input: {
  userId: string;
  includeArchived?: boolean;
}): Promise<SiteDashboardRow[]> {
  const [sites, entitlements, missionRows] = await Promise.all([
    db.site.findMany({
      where: {
        userId: input.userId,
        ...(input.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { updatedAt: "desc" },
    }),
    getAccountEntitlements(input.userId),
    // One row per domain (its newest mission) plus the previous scored mission
    // for the delta — instead of every mission the user has ever run.
    db.$queryRaw<
      Array<{
        domainKey: string;
        id: string;
        status: string;
        createdAt: Date;
        score: number | null;
        criticalCount: number | null;
        highCount: number | null;
        pdfUrl: string | null;
        priorScore: number | null;
      }>
    >`
      WITH base AS (
        SELECT lower(m.domain) AS "domainKey",
               m.id, m.status, m."createdAt", m."pdfUrl",
               (m.report->>'score')::float AS score,
               ROW_NUMBER() OVER (
                 PARTITION BY lower(m.domain) ORDER BY m."createdAt" DESC
               ) AS rn
        FROM "Mission" m
        WHERE m."userId" = ${input.userId}
      ),
      latest AS (SELECT * FROM base WHERE rn = 1),
      prior AS (
        SELECT DISTINCT ON ("domainKey") "domainKey", score
        FROM base
        WHERE rn > 1 AND status = 'complete' AND score IS NOT NULL
        ORDER BY "domainKey", "createdAt" DESC
      )
      SELECT l."domainKey", l.id, l.status, l."createdAt", l."pdfUrl", l.score,
             cnt."criticalCount", cnt."highCount", p.score AS "priorScore"
      FROM latest l
      LEFT JOIN prior p USING ("domainKey")
      -- Leak counts only for the one mission per domain we actually display.
      CROSS JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE x->>'severity' = 'critical')::int AS "criticalCount",
               COUNT(*) FILTER (WHERE x->>'severity' = 'high')::int    AS "highCount"
        FROM "Mission" mm,
             jsonb_array_elements(COALESCE(mm.report->'leaks', '[]'::jsonb)) x
        WHERE mm.id = l.id
      ) cnt`,
  ]);

  const missionByDomain = new Map(missionRows.map((m) => [m.domainKey, m]));

  return sites.map((site) => {
    const latest = missionByDomain.get(site.canonicalDomain);
    const priorScore = latest?.priorScore ?? null;
    const ent = getSiteEntitlementLabel(entitlements, site.canonicalDomain);

    return {
      id: site.id,
      canonicalDomain: site.canonicalDomain,
      displayName: site.displayName,
      archivedAt: site.archivedAt,
      faviconUrl: siteFaviconUrl(site.canonicalDomain),
      entitlementLabel: ent.label,
      planId: ent.planId,
      latestScore: latest?.score ?? null,
      scoreDelta:
        latest?.score != null && priorScore != null
          ? Math.round(latest.score - priorScore)
          : null,
      unresolvedCount: (latest?.criticalCount ?? 0) + (latest?.highCount ?? 0),
      lastScannedAt: latest?.createdAt ?? null,
      latestMissionId: latest?.id ?? null,
      latestMissionStatus: latest?.status ?? null,
      hasPdf: Boolean(latest?.pdfUrl && latest.status === "complete"),
      rescansRemaining: ent.rescansRemaining,
      rescansExpiresAt: ent.rescansExpiresAt,
    };
  });
}
