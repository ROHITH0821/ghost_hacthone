"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Radio, RotateCw } from "lucide-react";
import type { ReportViewMode } from "@/lib/entitlements/report-access";
import type { GhostReport, MissionState } from "@/lib/types";
import { StageList } from "./StageList";
import { PersonaCards } from "./PersonaCards";
import { ScanAnimation } from "./ScanAnimation";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { IntelligenceReportView } from "@/components/results/IntelligenceReportView";
import { CompetitorComparisonCta } from "@/components/results/CompetitorComparisonCta";
import { GhostScore } from "@/components/results/GhostScore";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";
import { dashboardNewAuditHref, dashboardComparisonsHref } from "@/lib/auth/new-audit-href";

interface MissionDashboardProps {
  mission: MissionState;
  report?: GhostReport | null;
  viewMode?: ReportViewMode;
}

export function MissionDashboard({ mission, report, viewMode = "free" }: MissionDashboardProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const isError = mission.status === "error";
  const isComplete = mission.status === "complete";
  const showPersonas =
    !report &&
    !isComplete &&
    !isError &&
    (mission.currentStage === "deploying" ||
      mission.currentStage === "testing" ||
      mission.currentStage === "leaks" ||
      mission.currentStage === "generating");

  const showScan = mission.status === "running" && !report;

  const handleRetry = () => {
    setRetrying(true);
    router.push(dashboardNewAuditHref(mission.url));
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 h-[50vh] w-[70vw] -translate-x-1/2 rounded-full bg-violet/[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <header className="section-pad border-b border-border">
          <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-4">
            <GhostLogo size="sm" />
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
              {isComplete ? (
                <>
                  <Link
                    href="/dashboard/overview"
                    className="text-xs text-muted transition-colors hover:text-ghost-white sm:text-sm"
                  >
                    {copy.results.goToDashboard}
                  </Link>
                  <Link
                    href={dashboardComparisonsHref(mission.domain)}
                    className="text-xs text-muted transition-colors hover:text-ghost-white sm:text-sm"
                  >
                    {copy.results.goToComparisons}
                  </Link>
                  <span className="hidden items-center gap-2 text-xs text-neon-green sm:flex">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {copy.mission.reportReady}
                  </span>
                </>
              ) : isError ? (
                <span className="hidden items-center gap-2 text-xs text-danger sm:flex">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {copy.mission.failed.heading}
                </span>
              ) : (
                <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
                  <Radio className="h-3 w-3 animate-pulse text-neon-green" />
                  {copy.mission.missionActive}
                </span>
              )}
              <span className="text-xs text-muted">{mission.domain}</span>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="section-pad mx-auto max-w-[1200px] py-8 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <AnimatePresence mode="wait">
              {isComplete && report ? (
                <motion.div
                  key="report-header"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_SMOOTH }}
                >
                  <p className="label-caps mb-4 text-neon-green">
                    {copy.results.intelligenceReady}
                  </p>
                  <h1 className="display-lg break-words font-heading text-ghost-white">
                    {report.domain}
                  </h1>
                  <p className="mt-4 text-sm text-muted">
                    {copy.common.scannedPrefix}
                    {new Date(report.scannedAt).toLocaleString()}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="mission-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <p className="label-caps mb-4">{copy.mission.agentsDeployed}</p>
                  <h1 className="display-lg break-words font-heading text-ghost-white">
                    {copy.mission.title}{" "}
                    <span className="text-gradient">{copy.mission.titleAccent}</span>
                  </h1>
                  <p className="mt-4 text-muted">
                    {copy.common.analyzingPrefix}
                    <span className="text-ai-blue">{mission.domain}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_SMOOTH }}
              className="mx-auto max-w-2xl"
            >
              <div className="brave-card flex flex-col items-center px-6 py-14 text-center md:px-10 md:py-20">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
                  <AlertTriangle className="h-7 w-7 text-danger" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-ghost-white md:text-3xl">
                  {copy.mission.failed.heading}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
                  {mission.error ?? copy.mission.failed.body}
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet/40 bg-violet/15 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-violet-glow transition-all hover:border-violet/60 hover:bg-violet/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                    {copy.mission.failed.retry}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-sm text-muted underline-offset-4 transition-colors hover:text-ghost-white hover:underline"
                  >
                    {copy.mission.failed.scanAnother}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mission.status === "running" && <p className="mb-6 text-sm text-muted-light">Ghost is reviewing accessible pages and simulating customer journeys. You can leave this page and return from Audits; your audit continues in the background.</p>}

          {!isError && (
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="min-w-0 lg:col-span-2">
              <div className="brave-card p-6 md:p-8">
                <p className="label-caps mb-6">
                  {isComplete ? copy.mission.missionComplete : copy.mission.missionProgress}
                </p>
                <StageList
                  currentStage={mission.currentStage}
                  stageProgress={isComplete ? 100 : mission.stageProgress}
                  allComplete={isComplete}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-8 lg:col-span-3">
              <AnimatePresence mode="wait">
                {showScan && (
                  <motion.div
                    key="scan"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, y: -20 }}
                    transition={{ duration: 0.4, ease: EASE_SMOOTH }}
                  >
                    <ScanAnimation
                      url={mission.url}
                      domain={mission.domain}
                      missionId={mission.id}
                      active={showScan}
                      currentStage={mission.currentStage}
                      stageProgress={mission.stageProgress}
                      mission={mission}
                    />
                  </motion.div>
                )}

                {isComplete && report && (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE_SMOOTH }}
                    className="brave-card flex flex-col items-center justify-center px-6 py-12 md:py-16"
                  >
                    <GhostScore score={report.score} />
                  </motion.div>
                )}

                {isComplete && !report && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="brave-card flex min-h-[320px] flex-col items-center justify-center gap-4 p-8"
                  >
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
                    <p className="text-sm text-muted">
                      {copy.mission.compilingReport}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <PersonaCards personas={mission.personas} mission={mission} show={showPersonas} />
            </div>
          </div>
          )}

          {/* Full report sections appear below the scan area */}
          {isComplete && report && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_SMOOTH }}
              className="mt-16 space-y-8 md:mt-24"
            >
              <CompetitorComparisonCta
                hasInlineIntel={false}
                fullReportHref={`/results/${mission.id}`}
                siteKey={mission.domain}
              />
              <IntelligenceReportView
                report={report}
                viewMode={viewMode}
                compact
                hideHeader
                hideScore
                showNewAnalysisCta
              />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
