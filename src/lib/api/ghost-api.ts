import { db } from "@/lib/db";
import { getSnapshotForSite } from "@/lib/data-sources/ga4/sync";
import { loadTrafficSupplement } from "@/lib/data-sources/ga4/traffic-supplement";
import { getMissionAuditConfigSnapshot } from "../db/missions";
import { ownerContextFromSnapshot } from "../ghost-engine/prompts";
/**
 * API client layer — backed by the real GHOST engine with Postgres as sole source of truth.
 *
 * POST /api/analyze      → scheduleMissionRun()
 * POST /api/missions/:id/run → runGhostAudit()
 * GET  /api/analyze?...  → getMissionStatus()   (live scan progress from DB)
 * GET  /api/reports/:id  → getReport()          (final GhostReport from DB)
 */

import { createInitialMission } from "../mock-data";
import { getPersonaThought, getPersonaLocation } from "../copy";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  GhostReport,
  MissionStage,
  MissionState,
} from "../types";
import { extractDomain, generateMissionId } from "../utils";

import {
  getMissionReportFromDb,
  getMissionStatusFromDb,
  persistMissionError,
  persistMissionPreviewUrl,
  persistMissionProgress,
  persistMissionReport,
} from "../db/missions";
import { assessCrawl, buildCrawlSignals, ingestUrl } from "../ghost-engine/ingest";
import { runAudit } from "../ghost-engine/pipeline";
import { toGhostReport } from "../ghost-engine/adapter";
import { scheduleMissionFinalize } from "../missions/trigger-finalize";
import { uploadMissionPreview } from "../storage/supabase";

function nowIso(): string {
  return new Date().toISOString();
}

export async function startGhostMission(
  request: AnalyzeRequest & { missionId?: string }
): Promise<AnalyzeResponse> {
  const missionId = request.missionId ?? generateMissionId();
  return { missionId, status: "started" };
}

export async function runGhostAudit(
  missionId: string,
  url: string,
  domain?: string
): Promise<void> {
  const resolvedDomain = domain ?? extractDomain(url);
  await runRealAudit(missionId, url, resolvedDomain);
}

export async function getMissionStatus(
  missionId: string
): Promise<MissionState | null> {
  try {
    return await getMissionStatusFromDb(missionId);
  } catch (error) {
    console.error("[ghost-api] mission status load from db failed:", error);
    return null;
  }
}

export async function getReport(missionId: string): Promise<GhostReport | null> {
  try {
    return await getMissionReportFromDb(missionId);
  } catch (error) {
    console.error("[ghost-api] report load from db failed:", error);
    return null;
  }
}

// --- internals --------------------------------------------------------------

async function patchMission(
  missionId: string,
  state: MissionState,
  patch: Partial<MissionState>,
): Promise<void> {
  Object.assign(state, patch);
  await persistMissionProgress(missionId, state);
}

async function appendProgressLog(
  missionId: string,
  state: MissionState,
  message: string,
  stage?: MissionStage,
): Promise<void> {
  const entry = { ts: nowIso(), stage: stage ?? state.currentStage, message };
  const next = [...(state.progressLog ?? []), entry].slice(-50);
  await patchMission(missionId, state, { progressLog: next });
}

async function setStage(
  missionId: string,
  state: MissionState,
  stage: MissionStage,
  progress: number,
): Promise<void> {
  await patchMission(missionId, state, {
    currentStage: stage,
    stageProgress: Math.min(100, Math.max(0, Math.round(progress))),
  });
}

async function advancePersonas(
  missionId: string,
  state: MissionState,
  pct: number,
): Promise<void> {
  const personas = state.personas.map((p, i) => ({
    ...p,
    progress: Math.min(100, Math.round(pct) + i * 4),
    thought: getPersonaThought(p.id, pct),
    location: getPersonaLocation(p.id, pct),
  }));
  await patchMission(missionId, state, { personas });
}

async function persistPreviewScreenshot(
  missionId: string,
  domain: string,
  screenshotB64: string,
): Promise<void> {
  try {
    const pngBytes = Uint8Array.from(Buffer.from(screenshotB64, "base64"));
    const uploaded = await uploadMissionPreview({ missionId, domain, pngBytes });
    await persistMissionPreviewUrl(missionId, uploaded.publicUrl);
  } catch (error) {
    console.error("[ghost-audit] preview upload failed:", error);
  }
}

async function loadAuditState(
  missionId: string,
  url: string,
  domain: string,
): Promise<MissionState> {
  const fromDb = await getMissionStatusFromDb(missionId);
  if (fromDb) return fromDb;
  return createInitialMission(missionId, url, domain);
}

async function runRealAudit(
  missionId: string,
  url: string,
  domain: string
): Promise<void> {
  const state = await loadAuditState(missionId, url, domain);

  try {
    await setStage(missionId, state, "understanding", 15);
    await appendProgressLog(missionId, state, "Starting crawl…", "understanding");

    let lowConfidence = false;
    let crawlSignals = buildCrawlSignals({
      rootUrl: url,
      pages: [],
      discoveredFrom: { sitemap: 0, links: 0 },
      truncated: false,
    });

    const pack = await ingestUrl(url, {
      onCrawled: async (crawl) => {
        const shot = crawl.pages.find((p) => p.screenshotB64)?.screenshotB64;
        if (shot) {
          await persistPreviewScreenshot(missionId, domain, shot);
          await appendProgressLog(
            missionId,
            state,
            "Captured homepage snapshot.",
            "understanding",
          );
        }
        await appendProgressLog(
          missionId,
          state,
          `Crawled ${crawl.pages.length} page(s) (${crawl.discoveredFrom.sitemap} from sitemap, ${crawl.discoveredFrom.links} from links).`,
          "understanding",
        );
        lowConfidence = assessCrawl(crawl).lowConfidence;
        crawlSignals = buildCrawlSignals(crawl);
        await setStage(missionId, state, "understanding", 100);
      },
    });

    const ownerContext = ownerContextFromSnapshot(await getMissionAuditConfigSnapshot(missionId));
    const trafficEvidence = await loadTrafficSupplement(async () => {
      const mission = await db.mission.findUnique({ where: { id: missionId }, select: { siteId: true } });
      return mission?.siteId ? getSnapshotForSite(mission.siteId) : null;
    });
    const result = await runAudit(pack, {
      onFlows: async (flows) => {
        await setStage(missionId, state, "personas", 100);
        await patchMission(missionId, state, {
          detectedFlows: flows.map((f) => ({
            id: f.id,
            name: f.name,
            goal: f.goal,
            revenue_weight: f.revenue_weight,
          })),
        });
        await appendProgressLog(
          missionId,
          state,
          `Detected ${flows.length} customer flow(s).`,
          "personas",
        );
      },
      onCustomer: async (journey, run, progress) => {
        const pct = (progress.done / progress.total) * 100;
        await setStage(missionId, state, "testing", pct);
        await advancePersonas(missionId, state, pct);
        await patchMission(missionId, state, {
          customerSnippets: [
            ...(state.customerSnippets ?? []),
            {
              flowId: run.flow.id,
              flowName: run.flow.name,
              outcome: journey.outcome,
              droppedAt: journey.dropped_at,
              steps: journey.journey.slice(0, 4),
            },
          ].slice(-12),
        });
        await appendProgressLog(
          missionId,
          state,
          `${run.flow.name}: ${journey.outcome}${journey.outcome !== "completed" ? ` (dropped at ${journey.dropped_at})` : ""}`,
          "testing",
        );
      },
      onAggregateStart: async () => setStage(missionId, state, "leaks", 40),
      onReport: async () => setStage(missionId, state, "leaks", 100),
      onFixesStart: async () => setStage(missionId, state, "generating", 20),
      onFix: async (_fix, progress) =>
        setStage(missionId, state, "generating", (progress.done / progress.total) * 100),
    }, { crawlSignals, ownerContext, trafficEvidence });

    const report = toGhostReport(missionId, url, domain, pack, result, { lowConfidence });

    try {
      await persistMissionReport(missionId, report);
    } catch (dbError) {
      console.error("[ghost-audit] mission report persist failed:", dbError);
      throw dbError;
    }
    state.status = "complete";
    await patchMission(missionId, state, {
      currentStage: "generating",
      stageProgress: 100,
    });
    await appendProgressLog(
      missionId,
      state,
      "Site report ready. Market intelligence continues in the background.",
      "generating",
    );
    scheduleMissionFinalize(missionId);
  } catch (error) {
    console.error("[ghost-audit]", error);
    if (state.status === "complete") {
      scheduleMissionFinalize(missionId);
      return;
    }
    const message = friendlyError(error);
    await patchMission(missionId, state, { status: "error", error: message });

    try {
      await persistMissionError(missionId, message);
    } catch (dbError) {
      console.error("[ghost-audit] mission error persist failed:", dbError);
    }
  }
}

/** Turn an engine/crawl error into a message safe to show a non-technical user. */
function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/Could not resolve host|ENOTFOUND|getaddrinfo/i.test(raw)) {
    return "We couldn't reach that website — check the URL is spelled correctly and the site is live.";
  }
  if (/private\/internal address|Unsupported URL scheme|Invalid URL/i.test(raw)) {
    return "That address can't be scanned. Please enter a public website URL (https://…).";
  }
  if (/no usable pages/i.test(raw)) {
    return "We reached the site but couldn't read any content from it. It may block automated visitors.";
  }
  if (/api key|authentication|ANTHROPIC_API_KEY|401/i.test(raw)) {
    return "The audit service isn't configured correctly. Please try again shortly.";
  }
  return "Something went wrong while auditing this site. Please try again.";
}

export type { AnalyzeResponse, MissionState, GhostReport };
