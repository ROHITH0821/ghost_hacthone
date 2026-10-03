/**
 * Test audit-complete email using an EXISTING stored PDF (no regenerate).
 *
 * Usage (from Ghost/):
 *   set -a && source .env.local && set +a && npx tsx scripts/test-audit-complete-email.ts
 *
 * Optional:
 *   MISSION_ID=mission-xxx   — specific mission with pdfUrl
 *   TO_EMAIL=you@example.com — override recipient
 *   FORCE=1                  — ignore notificationLog dedupe (still sends)
 */

import { db } from "../src/lib/db";
import { sendAuditCompleteEmail } from "../src/lib/auth/resend";
import type { GhostReport } from "../src/lib/types";
import { Prisma } from "@prisma/client";

async function main() {
  const missionIdEnv = process.env.MISSION_ID;
  const toOverride = process.env.TO_EMAIL;
  const force = process.env.FORCE === "1";

  const mission = missionIdEnv
    ? await db.mission.findUnique({
        where: { id: missionIdEnv },
        include: { user: { select: { email: true, id: true } } },
      })
    : await db.mission.findFirst({
        where: {
          status: "complete",
          pdfUrl: { not: null },
          report: { not: Prisma.DbNull },
          userId: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { email: true, id: true } } },
      });

  if (!mission?.pdfUrl || !mission.report) {
    throw new Error("No complete mission with pdfUrl + report found");
  }
  if (!mission.user?.email && !toOverride) {
    throw new Error("Mission has no user email — set TO_EMAIL=");
  }

  const report = mission.report as unknown as GhostReport;
  const to = toOverride ?? mission.user!.email;
  const criticalCount = (report.leaks ?? []).filter((l) => l.severity === "critical").length;

  console.log("Mission:", mission.id);
  console.log("Domain:", mission.domain);
  console.log("To:", to);
  console.log("PDF:", mission.pdfUrl);
  console.log("Score:", report.score);
  console.log("Force:", force);

  // HEAD-check existing PDF (do not generate)
  const head = await fetch(mission.pdfUrl, { method: "HEAD" });
  console.log("PDF HEAD:", head.status, head.headers.get("content-type"), head.headers.get("content-length"));
  if (!head.ok) {
    throw new Error(`Existing PDF not reachable (HTTP ${head.status})`);
  }

  if (!force && mission.userId) {
    const existing = await db.notificationLog.findUnique({
      where: {
        userId_type_refId: {
          userId: mission.userId,
          type: "audit_complete",
          refId: mission.id,
        },
      },
    });
    if (existing) {
      console.log(
        "NotificationLog already exists for this mission. Re-run with FORCE=1 to send anyway.",
      );
      return;
    }
  }

  const result = await sendAuditCompleteEmail({
    to,
    domain: mission.domain,
    missionId: mission.id,
    score: report.score,
    criticalCount,
    pdfUrl: mission.pdfUrl,
  });

  if (!result.success) {
    throw new Error(result.error ?? "Send failed");
  }

  console.log("✅ Audit complete email sent with existing PDF attached.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    await db.$disconnect();
    process.exit(1);
  });
