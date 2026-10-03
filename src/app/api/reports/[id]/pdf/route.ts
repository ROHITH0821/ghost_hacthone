import { NextRequest, NextResponse, after } from "next/server";
import { getReport } from "@/lib/api/ghost-api";
import { getSession } from "@/lib/auth";
import { assertMissionAccess, MissionAccessError } from "@/lib/auth/mission-access";
import { copy } from "@/lib/copy";
import {
  getCompetitorIntelligenceForMission,
  getMissionStoredPdf,
  persistMissionPdf,
} from "@/lib/db/missions";
import { getEntitlementForMission } from "@/lib/db/entitlements";
import { hasCompetitorIntelligenceAccess } from "@/lib/competitor-intelligence/access";
import { parseCompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import {
  getReportViewMode,
} from "@/lib/entitlements/report-access";
import type { PlanId } from "@/lib/plans";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { generateGhostReportPdf } from "@/lib/report/reportPdf";
import { loadReportPayload } from "@/lib/report/load-report-payload";
import { getPdfBrandForUser } from "@/lib/db/pdf-brand";
import { uploadMissionPdf } from "@/lib/storage/supabase";

// PDF generation uses Playwright — force the Node.js runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: copy.authApi.authRequired }, { status: 401 });
  }

  const { id } = await params;
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  let entitlement: Awaited<ReturnType<typeof getEntitlementForMission>> = null;

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    await assertMissionAccess(id, userId);

    entitlement = await getEntitlementForMission(id);
    const viewMode = entitlement
      ? getReportViewMode(entitlement.planId as PlanId, entitlement.auditType)
      : "full";
    if (viewMode === "free") {
      return NextResponse.json(
        { error: "PDF export requires a paid audit." },
        { status: 403 }
      );
    }
  } catch (error) {
    if (error instanceof MissionAccessError) {
      return NextResponse.json(
        { error: copy.authApi.reportNotFound },
        { status: error.code === "forbidden" ? 403 : 404 }
      );
    }
    throw error;
  }

  let marketIntelligence = undefined;
  if (
    entitlement &&
    hasCompetitorIntelligenceAccess({
      planId: entitlement.planId as PlanId,
      auditType: entitlement.auditType,
    })
  ) {
    const intelRow = await getCompetitorIntelligenceForMission(id);
    marketIntelligence =
      parseCompetitorIntelligence(intelRow?.competitorIntelligence) ?? undefined;
  }

  const storedPdf = await getMissionStoredPdf(id);
  const canUseStoredPdf =
    storedPdf &&
    (!marketIntelligence ||
      (storedPdf.pdfUploadedAt != null &&
        new Date(marketIntelligence.generatedAt) <= storedPdf.pdfUploadedAt));

  if (canUseStoredPdf) {
    const target = wantsDownload
      ? `${storedPdf.pdfUrl}?download=ghost-report.pdf`
      : storedPdf.pdfUrl;
    return NextResponse.redirect(target, 302);
  }

  const report = await getReport(id);
  if (!report) {
    return NextResponse.json({ error: copy.authApi.reportNotFound }, { status: 404 });
  }

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    const [brandOptions, payload] = await Promise.all([
      getPdfBrandForUser(userId),
      loadReportPayload(id),
    ]);
    const pdf = await generateGhostReportPdf(
      report,
      brandOptions,
      marketIntelligence,
      payload?.analyticsEvidence,
    );
    const safeName = report.domain.replace(/[^a-z0-9.-]/gi, "_") || "site";
    const filename = `ghost-report-${safeName}.pdf`;

    // Persist after the response so the next view is a storage redirect
    // instead of a fresh Playwright render. Skipped until storage env is set.
    if (storageConfigured()) {
      after(async () => {
        try {
          const uploaded = await uploadMissionPdf({
            missionId: id,
            domain: report.domain,
            pdfBytes: pdf,
          });
          await persistMissionPdf(id, { pdfUrl: uploaded.publicUrl });
        } catch (error) {
          console.error("[report-pdf] persist failed", error);
        }
      });
    }

    // Uint8Array is a valid response body at runtime; TS 5.7 typed-array generics
    // don't line up with BodyInit, so cast at this single boundary.
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        // A completed report's PDF is immutable — let the browser reuse it.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[report-pdf]", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
