import { db } from "@/lib/db";
import { getAccountEntitlements } from "@/lib/db/entitlements";
import { PLAN_IDS } from "@/lib/plans";

export async function isAgencyUser(userId: string): Promise<boolean> {
  const entitlements = await getAccountEntitlements(userId);
  return entitlements.some(
    (e) => e.planId === PLAN_IDS.agency2999 && e.status === "active"
  );
}

export async function getAgencyEntitlement(userId: string) {
  const entitlements = await getAccountEntitlements(userId);
  return (
    entitlements.find(
      (e) => e.planId === PLAN_IDS.agency2999 && e.status === "active"
    ) ?? null
  );
}

export async function getOrCreateWorkspace(userId: string, name?: string) {
  const existing = await db.agencyWorkspace.findUnique({
    where: { ownerId: userId },
  });
  if (existing) return existing;

  return db.agencyWorkspace.create({
    data: {
      ownerId: userId,
      name: name ?? "My Agency",
    },
  });
}

export async function getWorkspaceForUser(userId: string) {
  const agency = await isAgencyUser(userId);
  if (!agency) return null;

  return db.agencyWorkspace.findUnique({
    where: { ownerId: userId },
    include: { brandProfile: true },
  });
}

export async function assertWorkspaceOwner(userId: string, workspaceId: string) {
  const workspace = await db.agencyWorkspace.findFirst({
    where: { id: workspaceId, ownerId: userId },
  });
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}
