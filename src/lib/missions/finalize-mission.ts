import { acquireMissionLease, withMissionLease, assertMissionLease } from "./lease";
import { timeStage, executionLog } from "./execution-context";
import {
  parseCompetitorIntelligence,
  type CompetitorIntelligence,
} from "@/lib/competitor-intelligence/types";
import { db } from "@/lib/db";
import { handleMissionCompleteSideEffects, notifyAuditCompleteEmail } from "@/lib/db/fix-status";
import { patchMissionProgress, persistMissionPdf } from "@/lib/db/missions";
import { getPdfBrandForUser } from "@/lib/db/pdf-brand";
import { withTimeout } from "@/lib/ghost-engine/util";
import { generateGhostReportPdf } from "@/lib/report/reportPdf";
import { uploadMissionPdf } from "@/lib/storage/supabase";
import type { GhostReport } from "@/lib/types";

import { COMPETITOR_INTEL_BUDGET_MS, FINALIZE_WALL_MS, PDF_BUDGET_MS } from "./finalize-config";
import { retryMissionCompetitorIntelIfNeeded } from "./run-competitor-intel";

export type FinalizeStatus = "pending" | "complete" | "partial";

export type FinalizeProgress = {
  finalizeStatus?: FinalizeStatus;
  finalizeError?: string | null;
  finalizedAt?: string;
  intelStatus?: string;
};

export type FinalizeResult = {
  ok: boolean;
  skipped: boolean;
  intelOk: boolean;
  pdfOk: boolean;
  emailOk: boolean;
  errors: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function remainingMs(startedAt: number, wallMs: number): number {
  return Math.max(0, wallMs - (Date.now() - startedAt));
}

async function loadMissionForFinalize(missionId: string) {
  return db.mission.findUnique({
    where: { id: missionId },
    select: {
      id: true,
      url: true,
      domain: true,
      status: true,
      userId: true,
      report: true,
      pdfUrl: true,
      progress: true,
      competitorIntelligence: true,
    },
  });
}

async function hasAuditCompleteNotification(missionId: string, userId: string | null) {
  if (!userId) return true;
  const row = await db.notificationLog.findUnique({
    where: {
      userId_type_refId: {
        userId,
        type: "audit_complete",
        refId: missionId,
      },
    },
  });
  return Boolean(row);
}

export async function isFinalizeComplete(missionId: string): Promise<boolean> {
  const mission = await loadMissionForFinalize(missionId);
  if (!mission || mission.status !== "complete" || !mission.report) return false;

  const progress = (mission.progress ?? {}) as FinalizeProgress;
  if (progress.finalizeStatus !== "complete") return false;
  if (!mission.pdfUrl) return false;

  return hasAuditCompleteNotification(missionId, mission.userId);
}

export async function markFinalizePending(missionId: string): Promise<void> {
  await patchMissionProgress(missionId, {
    finalizeStatus: "pending" satisfies FinalizeStatus,
    finalizeError: null,
  });
}

async function persistFinalizeOutcome(
  missionId: string,
  input: {
    status: FinalizeStatus;
    error?: string | null;
    progressPatch?: Record<string, unknown>;
  },
): Promise<void> {
  await patchMissionProgress(missionId, {
    ...input.progressPatch,
    finalizeStatus: input.status,
    finalizeError: input.error ?? null,
    finalizedAt: new Date().toISOString(),
  });
}

async function runSideEffects(missionId: string, report: GhostReport): Promise<void> {
  await handleMissionCompleteSideEffects(missionId, report);
}

async function runPdfStep(input: {
  missionId: string;
  report: GhostReport;
  userId: string | null;
  intelligence: CompetitorIntelligence | null | undefined;
  budgetMs: number;
}): Promise<{ ok: boolean; pdfUrl: string | null; error?: string }> {
  try {
    const brandOptions = input.userId
      ? await withTimeout(getPdfBrandForUser(input.userId), 10_000, "PDF branding")
      : undefined;

    const pdf = await withTimeout(
      generateGhostReportPdf(input.report, brandOptions, input.intelligence ?? undefined),
      input.budgetMs,
      "PDF generation",
    );
    await assertMissionLease();
    const uploaded = await withTimeout(
      uploadMissionPdf({
        missionId: input.missionId,
        domain: input.report.domain,
        pdfBytes: pdf,
      }),
      20_000,
      "PDF upload",
    );
    await persistMissionPdf(input.missionId, { pdfUrl: uploaded.publicUrl });
    console.log(`[finalize] pdf_ok mission=${input.missionId}`);
    return { ok: true, pdfUrl: uploaded.publicUrl };
  } catch (error) {
    const msg = errorMessage(error);
    console.error(`[finalize] pdf_fail mission=${input.missionId}:`, msg);
    return { ok: false, pdfUrl: null, error: msg };
  }
}

/**
 * Post-report pipeline: side effects, PDF, email.
 * Competitor intel runs in the audit phase before persist — loaded from DB here for PDF.
 */
async function executeFinalizeMission(
  missionId: string,
  options?: { force?: boolean },
): Promise<FinalizeResult> {
  if (!options?.force && (await isFinalizeComplete(missionId))) {
    console.log(`[finalize] skip mission=${missionId} already complete`);
    return {
      ok: true,
      skipped: true,
      intelOk: true,
      pdfOk: true,
      emailOk: true,
      errors: [],
    };
  }

  const mission = await loadMissionForFinalize(missionId);
  if (!mission?.report || mission.status !== "complete") {
    return {
      ok: false,
      skipped: false,
      intelOk: false,
      pdfOk: false,
      emailOk: false,
      errors: ["Mission is not complete or has no report"],
    };
  }

  const report = mission.report as unknown as GhostReport;
  const errors: string[] = [];
  const startedAt = Date.now();
  let pdfOk = false;
  let emailOk = false;
  let pdfUrl: string | null = mission.pdfUrl;
  let competitorIntelligence: CompetitorIntelligence | null =
    parseCompetitorIntelligence(mission.competitorIntelligence) ?? null;

  const progress = (mission.progress ?? {}) as FinalizeProgress;
  const intelOk =
    progress.intelStatus === "complete" ||
    progress.intelStatus === "partial" ||
    Boolean(competitorIntelligence);

  console.log(`[finalize] start mission=${missionId}`);

  await markFinalizePending(missionId);

  if (!competitorIntelligence) {
    const intelBudget = Math.min(
      COMPETITOR_INTEL_BUDGET_MS,
      remainingMs(startedAt, FINALIZE_WALL_MS) - PDF_BUDGET_MS - 8_000,
    );
    if (intelBudget >= 30_000) {
      const retry = await retryMissionCompetitorIntelIfNeeded({
        missionId,
        url: mission.url,
        domain: mission.domain,
        ownerReport: report,
        force: true,
        budgetMs: intelBudget,
      });
      if (retry?.intelligence) {
        competitorIntelligence = retry.intelligence;
      }
      if (retry?.error) errors.push(`intel_retry: ${retry.error}`);
    }
  }

  try {
    await assertMissionLease();
    await runSideEffects(missionId, report);
  } catch (error) {
    console.error(`[finalize] side_effects_fail mission=${missionId}:`, error);
    errors.push(`side_effects: ${errorMessage(error)}`);
  }

  if (!pdfUrl) {
    const pdfBudget = Math.min(
      PDF_BUDGET_MS,
      remainingMs(startedAt, FINALIZE_WALL_MS) - 5_000,
    );
    if (pdfBudget > 10_000) {
      const pdfResult = await runPdfStep({
        missionId,
        report,
        userId: mission.userId,
        intelligence: competitorIntelligence,
        budgetMs: pdfBudget,
      });
      pdfOk = pdfResult.ok;
      pdfUrl = pdfResult.pdfUrl;
      if (pdfResult.error) errors.push(`pdf: ${pdfResult.error}`);
    } else {
      errors.push("pdf: insufficient time budget");
    }
  } else {
    pdfOk = true;
  }

  try {
    await assertMissionLease();
    await notifyAuditCompleteEmail(missionId, report, pdfUrl);
    emailOk = true;
    console.log(`[finalize] email_ok mission=${missionId}`);
  } catch (error) {
    errors.push(`email: ${errorMessage(error)}`);
    console.error(`[finalize] email_fail mission=${missionId}:`, error);
  }

  const finalizeStatus: FinalizeStatus =
    pdfOk && emailOk ? "complete" : "partial";

  await persistFinalizeOutcome(missionId, {
    status: finalizeStatus,
    error: errors.length ? errors.join("; ") : null,
  });

  console.log(
    `[finalize] complete mission=${missionId} status=${finalizeStatus} pdf=${pdfOk} email=${emailOk}`,
  );

  return {
    ok: pdfOk && emailOk,
    skipped: false,
    intelOk,
    pdfOk,
    emailOk,
    errors,
  };
}

export async function finalizeMission(missionId: string, options?: { force?: boolean }): Promise<FinalizeResult> {
  const lease = await acquireMissionLease(missionId, "finalize", options?.force);
  if (!lease) {
    const mission = await loadMissionForFinalize(missionId);
    const eligible = Boolean(mission?.report && mission.status === "complete");
    return { ok: eligible, skipped: eligible, intelOk: false, pdfOk: false, emailOk: false, errors: eligible ? [] : ["Mission is not complete or has no report"] };
  }
  return withMissionLease(lease, async () => {
    try {
      const result = await timeStage("finalization", () => executeFinalizeMission(missionId, options));
      if (!result.ok) lease.failure ??= "finalize_partial";
      executionLog("mission.outcome", { ok: result.ok, failure: result.ok ? null : "finalize_partial" });
      return result;
    } catch (error) {
      await persistFinalizeOutcome(missionId, { status: "partial", error: "Finalization failed; recovery will retry." });
      throw error;
    }
  });
}

export async function findMissionsNeedingFinalize(limit: number): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT m."id" FROM "Mission" m WHERE m."status" = 'complete' AND m."report" IS NOT NULL
      AND (COALESCE(m."progress"->>'finalizeStatus', '') <> 'complete'
        OR m."pdfUrl" IS NULL OR (m."userId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "NotificationLog" n WHERE n."userId" = m."userId" AND n."type" = 'audit_complete' AND n."refId" = m."id")))
      AND (m."progress"->'finalizeLease'->>'token' IS NULL
        OR COALESCE((m."progress"->'finalizeLease'->>'expiresAt')::numeric, 0) <= extract(epoch from clock_timestamp()) * 1000)
    ORDER BY m."createdAt" ASC LIMIT ${Math.max(1, Math.floor(limit))}
  `;
  return rows.map(row => row.id);
}
