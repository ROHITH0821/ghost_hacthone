import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { GhostReport } from "@/lib/types";
import { buildHandoffDraft, FIX_SHARE_DAYS, FIX_SHARE_TOKEN, HandoffInputSchema, HandoffSnapshotSchema, type HandoffInput } from "@/lib/fixes/handoff";

// Match the board's ownership rule, including sites managed by an agency owner.
const ownedFix = (userId: string, fixId: string) => ({ id: fixId, OR: [{ userId }, { site: { userId } }] });
const shareDetails = (share: { id: string; expiresAt: Date }) => ({ path: `/share/fixes/${share.id}`, expiresAt: share.expiresAt.toISOString() });

export async function getFixHandoff(userId: string, fixId: string) {
  const fix = await db.fixStatus.findFirst({
    where: ownedFix(userId, fixId),
    include: { mission: { select: { report: true, domain: true } }, developerShare: true },
  });
  if (!fix) return null;
  const active = fix.developerShare && fix.developerShare.expiresAt > new Date() ? fix.developerShare : null;
  const saved = active ? HandoffSnapshotSchema.safeParse(active.snapshot) : null;
  return {
    draft: saved?.success ? saved.data : buildHandoffDraft(fix, fix.mission.report as unknown as GhostReport | null, fix.mission.domain),
    share: active ? shareDetails(active) : null,
  };
}

/** Serialize management changes so concurrent creates reuse the same link. */
export async function publishFixHandoff(userId: string, fixId: string, input: HandoffInput) {
  const parsed = HandoffInputSchema.parse(input);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "FixStatus" WHERE "id" = ${fixId} FOR UPDATE`;
    const fix = await tx.fixStatus.findFirst({ where: ownedFix(userId, fixId), include: { mission: { select: { domain: true } }, developerShare: true } });
    if (!fix) return null;
    const snapshot = HandoffSnapshotSchema.parse({ ...parsed, version: 1, title: fix.title.slice(0, 300), domain: fix.mission.domain.slice(0, 253) });
    const active = fix.developerShare && fix.developerShare.expiresAt > new Date() ? fix.developerShare : null;
    const data = { snapshot: snapshot as unknown as Prisma.InputJsonValue };
    const replacement = { ...data, id: randomBytes(32).toString("base64url"), expiresAt: new Date(Date.now() + FIX_SHARE_DAYS * 86400_000) };
    const share = active
      ? await tx.fixShare.update({ where: { fixId }, data })
      : await tx.fixShare.upsert({ where: { fixId }, create: { ...replacement, fixId }, update: { ...replacement, createdAt: new Date() } });
    return { draft: snapshot, share: shareDetails(share) };
  });
}

export async function revokeFixHandoff(userId: string, fixId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "FixStatus" WHERE "id" = ${fixId} FOR UPDATE`;
    if (!await tx.fixStatus.findFirst({ where: ownedFix(userId, fixId), select: { id: true } })) return false;
    await tx.fixShare.deleteMany({ where: { fixId } });
    return true;
  });
}

export async function getSharedFix(token: string) {
  if (!FIX_SHARE_TOKEN.test(token)) return null;
  const share = await db.fixShare.findFirst({ where: { id: token, expiresAt: { gt: new Date() } }, select: { snapshot: true, expiresAt: true } });
  if (!share) return null;
  const parsed = HandoffSnapshotSchema.safeParse(share.snapshot);
  return parsed.success ? { snapshot: parsed.data, expiresAt: share.expiresAt.toISOString() } : null;
}
