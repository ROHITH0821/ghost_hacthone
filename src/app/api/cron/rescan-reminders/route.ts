import { NextRequest, NextResponse } from "next/server";
import { sendRescanExpiryEmail } from "@/lib/auth/resend";
import { db } from "@/lib/db";
import { PLAN_IDS } from "@/lib/plans";

export const runtime = "nodejs";

function daysUntil(date: Date) {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function sendIfNeeded(input: {
  userId: string;
  email: string;
  entitlementId: string;
  domain: string;
  expiresAt: Date;
  type: "rescan_expiry_14" | "rescan_expiry_3";
  daysLeft: number;
}) {
  const existing = await db.notificationLog.findUnique({
    where: {
      userId_type_refId: {
        userId: input.userId,
        type: input.type,
        refId: input.entitlementId,
      },
    },
  });
  if (existing) return false;

  try {
    await db.notificationLog.create({
      data: {
        userId: input.userId,
        type: input.type,
        refId: input.entitlementId,
      },
    });
  } catch {
    return false;
  }

  await sendRescanExpiryEmail({
    to: input.email,
    domain: input.domain,
    expiresAt: input.expiresAt,
    daysLeft: input.daysLeft,
  });

  return true;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/rescan-reminders] CRON_SECRET is not set");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlements = await db.entitlement.findMany({
    where: {
      planId: PLAN_IDS.deep999,
      status: "active",
      rescansRemaining: { gt: 0 },
      rescansExpiresAt: { gt: new Date() },
    },
    include: {
      user: { select: { id: true, email: true } },
      site: { select: { canonicalDomain: true } },
    },
  });

  let sent = 0;

  for (const ent of entitlements) {
    if (!ent.rescansExpiresAt || !ent.user?.email) continue;
    const domain =
      ent.site?.canonicalDomain ??
      (ent.boundUrl ? ent.boundUrl.replace(/^https?:\/\//, "").split("/")[0] : "your site");
    const left = daysUntil(ent.rescansExpiresAt);

    if (left <= 14 && left > 3) {
      const ok = await sendIfNeeded({
        userId: ent.user.id,
        email: ent.user.email,
        entitlementId: ent.id,
        domain,
        expiresAt: ent.rescansExpiresAt,
        type: "rescan_expiry_14",
        daysLeft: left,
      });
      if (ok) sent += 1;
    }

    if (left <= 3 && left >= 0) {
      const ok = await sendIfNeeded({
        userId: ent.user.id,
        email: ent.user.email,
        entitlementId: ent.id,
        domain,
        expiresAt: ent.rescansExpiresAt,
        type: "rescan_expiry_3",
        daysLeft: left,
      });
      if (ok) sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
