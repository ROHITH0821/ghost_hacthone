"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReportViewMode } from "@/lib/entitlements/report-access";
import type { GhostReport, MissionState } from "@/lib/types";
import { AuditTheater } from "./AuditTheater";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { IntelligenceReportView } from "@/components/results/IntelligenceReportView";
import { CompetitorComparisonCta } from "@/components/results/CompetitorComparisonCta";
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

  const handleRetry = () => {
    setRetrying(true);
    router.push(dashboardNewAuditHref(mission.url));
  };

  const readReport = () => document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (isError) {
    return (
      <div className="relative min-h-screen">
        <header className="section-pad border-b border-line">
          <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-4">
            <GhostLogo size="sm" />
            <span className="mono-label text-ash-text">{mission.domain}</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="section-pad mx-auto max-w-[1200px] py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_SMOOTH }}
            className="mx-auto max-w-2xl"
          >
            <div className="brave-card flex flex-col items-center px-6 py-14 text-center md:px-10 md:py-20">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-ember/25 bg-ember-soft">
                <AlertTriangle className="h-7 w-7 text-ember-text" />
              </div>
              <h1 className="font-heading text-2xl font-medium tracking-[-0.03em] text-ink md:text-3xl">
                {copy.mission.failed.heading}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-graphite md:text-base">
                {mission.error ?? copy.mission.failed.body}
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#24252A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                  {copy.mission.failed.retry}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="min-h-11 text-sm text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {copy.mission.failed.scanAnother}
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <main id="main-content" tabIndex={-1}>
        <AuditTheater mission={mission} report={report} onReadReport={readReport} />

        {isComplete && report && (
          <div id="report" className="section-pad mx-auto max-w-[1200px] scroll-mt-6 py-12 md:py-16">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
              <div>
                <p className="mono-label text-resolved-text">{copy.results.intelligenceReady}</p>
                <p className="mt-2 font-heading text-[clamp(28px,3.4vw,44px)] font-medium tracking-[-0.035em] text-ink">{report.domain}</p>
                <p className="mt-1 text-sm text-ash-text">{copy.common.scannedPrefix}{new Date(report.scannedAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/dashboard/overview" className="text-sm text-graphite transition-colors hover:text-ink">{copy.results.goToDashboard}</Link>
                <Link href={dashboardComparisonsHref(mission.domain)} className="text-sm text-graphite transition-colors hover:text-ink">{copy.results.goToComparisons}</Link>
              </div>
            </div>
            <div className="space-y-8">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
