import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getOrCreateWorkspace,
  getWorkspaceForUser,
} from "@/lib/db/agency-workspace";
import { canonicalizeDomain, upsertSiteForUser } from "@/lib/db/sites";
import { siteFaviconUrl } from "@/lib/plans";

export type ClientDashboardRow = {
  id: string;
  name: string;
  primaryDomain: string;
  referenceId: string | null;
  archivedAt: Date | null;
  faviconUrl: string;
  latestScore: number | null;
  criticalCount: number;
  latestMissionId: string | null;
  latestMissionStatus: string | null;
  lastScannedAt: Date | null;
  siteId: string | null;
};

export type ClientDetail = ClientDashboardRow & {
  defaults: Record<string, unknown> | null;
  workspaceId: string;
};

async function workspaceForUser(userId: string) {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) return null;
  return workspace;
}

export async function listClientsForUser(
  userId: string,
  includeArchived = false
): Promise<ClientDashboardRow[]> {
  const workspace = await workspaceForUser(userId);
  if (!workspace) return [];

  const clients = await db.client.findMany({
    where: {
      workspaceId: workspace.id,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { updatedAt: "desc" },
  });

  if (clients.length === 0) return [];

  // Enrich every client in two set-based queries rather than two per client.
  const clientIds = clients.map((c) => c.id);

  const [sites, latestMissions] = await Promise.all([
    db.site.findMany({
      where: { userId, clientId: { in: clientIds } },
      select: { id: true, clientId: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    // DISTINCT ON keeps only each client's newest mission, and the score /
    // critical count are projected in SQL so the report JSON never travels.
    db.$queryRaw<
      Array<{
        clientId: string;
        id: string;
        status: string;
        createdAt: Date;
        score: number | null;
        criticalCount: number | null;
      }>
    >`
      SELECT DISTINCT ON (m."clientId")
             m."clientId", m.id, m.status, m."createdAt",
             (m.report->>'score')::float AS score,
             (
               SELECT COUNT(*)::int
               FROM jsonb_array_elements(COALESCE(m.report->'leaks', '[]'::jsonb)) l
               WHERE l->>'severity' = 'critical'
             ) AS "criticalCount"
      FROM "Mission" m
      WHERE m."userId" = ${userId}
        AND m."clientId" IN (${Prisma.join(clientIds)})
      ORDER BY m."clientId", m."createdAt" DESC`,
  ]);

  const siteByClient = new Map<string, string>();
  for (const site of sites) {
    // Rows arrive newest-first, so the first hit per client wins.
    if (site.clientId && !siteByClient.has(site.clientId)) {
      siteByClient.set(site.clientId, site.id);
    }
  }

  const missionByClient = new Map(latestMissions.map((m) => [m.clientId, m]));

  return clients.map((client) => {
    const latestMission = missionByClient.get(client.id);
    return {
      id: client.id,
      name: client.name,
      primaryDomain: client.primaryDomain,
      referenceId: client.referenceId,
      archivedAt: client.archivedAt,
      faviconUrl: siteFaviconUrl(client.primaryDomain),
      latestScore: latestMission?.score ?? null,
      criticalCount: latestMission?.criticalCount ?? 0,
      latestMissionId: latestMission?.id ?? null,
      latestMissionStatus: latestMission?.status ?? null,
      lastScannedAt: latestMission?.createdAt ?? null,
      siteId: siteByClient.get(client.id) ?? null,
    };
  });
}

async function enrichClientRow(
  userId: string,
  client: {
    id: string;
    name: string;
    primaryDomain: string;
    referenceId: string | null;
    archivedAt: Date | null;
  }
): Promise<ClientDashboardRow> {
  const site = await db.site.findFirst({
    where: { userId, clientId: client.id },
    orderBy: { updatedAt: "desc" },
  });

  // Project score / critical count in SQL — the report JSON is far too big to
  // pull across the wire just to read two numbers off it.
  const [latestMission] = await db.$queryRaw<
    Array<{
      id: string;
      status: string;
      createdAt: Date;
      score: number | null;
      criticalCount: number | null;
    }>
  >`
    SELECT m.id, m.status, m."createdAt",
           (m.report->>'score')::float AS score,
           (
             SELECT COUNT(*)::int
             FROM jsonb_array_elements(COALESCE(m.report->'leaks', '[]'::jsonb)) l
             WHERE l->>'severity' = 'critical'
           ) AS "criticalCount"
    FROM "Mission" m
    WHERE m."userId" = ${userId} AND m."clientId" = ${client.id}
    ORDER BY m."createdAt" DESC
    LIMIT 1`;

  const latestScore = latestMission?.score ?? null;
  const criticalCount = latestMission?.criticalCount ?? 0;

  return {
    id: client.id,
    name: client.name,
    primaryDomain: client.primaryDomain,
    referenceId: client.referenceId,
    archivedAt: client.archivedAt,
    faviconUrl: siteFaviconUrl(client.primaryDomain),
    latestScore,
    criticalCount,
    latestMissionId: latestMission?.id ?? null,
    latestMissionStatus: latestMission?.status ?? null,
    lastScannedAt: latestMission?.createdAt ?? null,
    siteId: site?.id ?? null,
  };
}

export async function getClientForUser(userId: string, clientId: string): Promise<ClientDetail | null> {
  const workspace = await workspaceForUser(userId);
  if (!workspace) return null;

  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId: workspace.id },
  });
  if (!client) return null;

  const row = await enrichClientRow(userId, client);
  return {
    ...row,
    defaults: (client.defaults as Record<string, unknown> | null) ?? null,
    workspaceId: workspace.id,
  };
}

export async function createClient(input: {
  userId: string;
  name: string;
  primaryDomain: string;
  referenceId?: string;
  defaults?: Record<string, unknown>;
}) {
  const workspace = await getOrCreateWorkspace(input.userId);
  const primaryDomain = canonicalizeDomain(input.primaryDomain);

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      name: input.name.trim(),
      primaryDomain,
      referenceId: input.referenceId?.trim() || null,
      defaults: input.defaults
        ? (input.defaults as Prisma.InputJsonValue)
        : undefined,
    },
  });

  const site = await upsertSiteForUser({
    userId: input.userId,
    url: `https://${primaryDomain}`,
    displayName: input.name.trim(),
  });

  await db.site.update({
    where: { id: site.id },
    data: { clientId: client.id },
  });

  return enrichClientRow(input.userId, client);
}

export async function updateClient(input: {
  userId: string;
  clientId: string;
  name?: string;
  referenceId?: string | null;
  defaults?: Record<string, unknown> | null;
}) {
  const workspace = await workspaceForUser(input.userId);
  if (!workspace) throw new Error("Workspace not found");

  const updated = await db.client.updateMany({
    where: { id: input.clientId, workspaceId: workspace.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
      ...(input.defaults !== undefined
        ? { defaults: (input.defaults ?? undefined) as Prisma.InputJsonValue | undefined }
        : {}),
    },
  });
  if (updated.count === 0) throw new Error("Client not found");

  const client = await db.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw new Error("Client not found");
  return enrichClientRow(input.userId, client);
}

export async function archiveClient(userId: string, clientId: string) {
  const workspace = await workspaceForUser(userId);
  if (!workspace) throw new Error("Workspace not found");

  return db.client.updateMany({
    where: { id: clientId, workspaceId: workspace.id },
    data: { archivedAt: new Date() },
  });
}

export async function unarchiveClient(userId: string, clientId: string) {
  const workspace = await workspaceForUser(userId);
  if (!workspace) throw new Error("Workspace not found");

  return db.client.updateMany({
    where: { id: clientId, workspaceId: workspace.id },
    data: { archivedAt: null },
  });
}

export async function linkSiteToClient(input: {
  userId: string;
  clientId: string;
  url: string;
}) {
  const client = await getClientForUser(input.userId, input.clientId);
  if (!client) throw new Error("Client not found");

  const site = await upsertSiteForUser({
    userId: input.userId,
    url: input.url,
    displayName: client.name,
  });

  await db.site.update({
    where: { id: site.id },
    data: { clientId: input.clientId },
  });

  return site;
}

export async function getRunningMissionsForAgency(userId: string) {
  return db.mission.findMany({
    where: { userId, status: "running", clientId: { not: null } },
    include: {
      client: { select: { name: true, primaryDomain: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
