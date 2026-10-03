"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { AuditConfigSnapshot } from "@/lib/audit-config/types";
import type { GhostReport } from "@/lib/types";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { TextLink } from "@/components/ui/BRAVE";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { AuditSetupSection } from "@/components/results/AuditSetupSection";
import { CompetitorComparisonCta } from "@/components/results/CompetitorComparisonCta";
import { IntelFailureBanner } from "@/components/results/IntelFailureBanner";
import { IntelligenceReportView } from "@/components/results/IntelligenceReportView";
import type { ReportViewMode } from "@/lib/entitlements/report-access";
import type { ReportPayload } from "@/lib/report/load-report-payload";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { copy } from "@/lib/copy";
import { dashboardComparisonsHref } from "@/lib/auth/new-audit-href";
import { isMarketIntelPending } from "@/lib/competitor-intelligence/intel-pending";

interface ResultsPageClientProps {
  missionId: string;
  /** Server-rendered payload; when present no client fetch is needed. */
  initial?: ReportPayload | null;
}

export function ResultsPageClient({ missionId, initial }: ResultsPageClientProps) {
  const [report, setReport] = useState<GhostReport | null>(initial?.report ?? null);
  const [viewMode, setViewMode] = useState<ReportViewMode>(
    initial?.viewMode ?? "full"
  );
  const [auditSetup, setAuditSetup] = useState<AuditConfigSnapshot | null>(
    initial?.auditConfigSnapshot ?? null
  );
  const [hasMarketIntel, setHasMarketIntel] = useState(
    Boolean(initial?.competitorIntelligence)
  );
  const [marketIntelExpected, setMarketIntelExpected] = useState(
    initial?.marketIntelExpected ?? false
  );
  const [hasCompetitorCrawlPacks, setHasCompetitorCrawlPacks] = useState(
    initial?.hasCompetitorCrawlPacks ?? false
  );
  const [intelError, setIntelError] = useState<string | null>(
    initial?.intelError ?? null
  );
  const [intelStatus, setIntelStatus] = useState<string | null>(
    initial?.intelStatus ?? null
  );
  const [analyticsEvidence, setAnalyticsEvidence] = useState<ExternalEvidence | null>(
    initial?.analyticsEvidence ?? null
  );
  const [siteId, setSiteId] = useState<string | null>(
    initial?.siteId ?? null
  );
  const [fetchError, setFetchError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(!initial);
  const router = useRouter();

  useEffect(() => {
    if (initial) return;

    async function fetchReport() {
      setLoading(true);
      setFetchError(false);
      try {
        const res = await fetch(`/api/reports/${missionId}`, {
          cache: "default",
        });
        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
          setViewMode(data.viewMode ?? "full");
          setAuditSetup(data.auditConfigSnapshot ?? null);
          setHasMarketIntel(Boolean(data.competitorIntelligence));
          setMarketIntelExpected(Boolean(data.marketIntelExpected));
          setHasCompetitorCrawlPacks(Boolean(data.hasCompetitorCrawlPacks));
          setIntelError(data.intelError ?? null);
          setIntelStatus(data.intelStatus ?? null);
          setAnalyticsEvidence(data.analyticsEvidence ?? null);
          setSiteId(data.siteId ?? null);
        } else { setFetchError(true); }
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [missionId, initial, attempt]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-border border-t-violet"
        />
      </div>
    );
  }

  if (!report) return <main id="main-content" className="mx-auto max-w-xl px-6 py-24"><FeedbackState title={fetchError ? "Your report couldn’t load" : "Report unavailable"} description="Check your connection or return to your workspace to find this audit." onRetry={() => setAttempt(n => n + 1)}><Link href="/dashboard/audits" className="mt-5 text-sm text-violet">Back to audits</Link></FeedbackState></main>;

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-50 section-pad border-b border-border bg-midnight/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-4">
          <GhostLogo size="sm" />
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
            <Link
              href="/dashboard/overview"
              className="text-sm text-muted transition-colors hover:text-ghost-white"
            >
              {copy.results.goToDashboard}
            </Link>
            <Link
              href={dashboardComparisonsHref(report.domain)}
              className="text-sm text-muted transition-colors hover:text-ghost-white"
            >
              {copy.results.goToComparisons}
            </Link>
            <TextLink onClick={() => router.push(dashboardNewAuditHref())} className="!text-sm">
              {copy.common.newAnalysis}
            </TextLink>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="relative z-10 section-pad mx-auto max-w-[1400px] space-y-10 py-8 md:space-y-10 md:py-12">
        {marketIntelExpected && !hasMarketIntel && isMarketIntelPending({
          hasIntel: hasMarketIntel,
          intelStatus,
        }) ? (
          <div className="rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-sm text-ghost-white">
            <p className="font-semibold">{copy.dashboardComparisons.intelInProgressTitle}</p>
            <p className="mt-1 text-muted-light">{copy.dashboardComparisons.intelInProgressBody}</p>
            <Link
              href={dashboardComparisonsHref(report.domain)}
              className="mt-3 inline-block text-violet hover:underline"
            >
              {copy.results.goToComparisons}
            </Link>
          </div>
        ) : marketIntelExpected && !hasMarketIntel ? (
          <IntelFailureBanner
            missionId={missionId}
            hasCompetitorCrawlPacks={hasCompetitorCrawlPacks}
            intelError={intelError}
          />
        ) : null}
        <IntelligenceReportView
          report={report}
          viewMode={viewMode}
          analyticsEvidence={analyticsEvidence}
          siteId={siteId}
        />
        {auditSetup && <AuditSetupSection snapshot={auditSetup} />}
        <CompetitorComparisonCta
          hasInlineIntel={hasMarketIntel}
          siteKey={report.domain}
        />
      </main>
    </div>
  );
}
