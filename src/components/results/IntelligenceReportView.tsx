"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Info, Volume2, VolumeX } from "lucide-react";
import type { GhostReport } from "@/lib/types";
import { ScrollReveal, SectionHeading, TextLink } from "@/components/ui/BRAVE";
import { GhostScore } from "@/components/results/GhostScore";
import { BusinessUnderstandingCard } from "@/components/results/BusinessUnderstanding";
import { JourneyMap } from "@/components/results/JourneyMap";
import { LeakCards } from "@/components/results/LeakCards";
import { FixCenter } from "@/components/results/FixCenter";
import { ScoreBreakdown } from "@/components/results/ScoreBreakdown";
import type { ReportViewMode } from "@/lib/entitlements/report-access";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { AnalyticsEvidenceBanner } from "@/components/results/AnalyticsEvidenceBanner";
import { AnalyticsSummaryCard } from "@/components/results/AnalyticsSummaryCard";
import { Ga4ConnectCta } from "@/components/results/Ga4ConnectCta";
import { copy } from "@/lib/copy";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { EASE_SMOOTH } from "@/lib/motion";

interface IntelligenceReportViewProps {
  report: GhostReport;
  compact?: boolean;
  showNewAnalysisCta?: boolean;
  hideHeader?: boolean;
  hideScore?: boolean;
  viewMode?: ReportViewMode;
  analyticsEvidence?: ExternalEvidence | null;
  siteId?: string | null;
}

export function IntelligenceReportView({
  report,
  compact = false,
  showNewAnalysisCta = true,
  hideHeader = false,
  hideScore = false,
  viewMode = "full",
  analyticsEvidence,
  siteId,
}: IntelligenceReportViewProps) {
  const isFreeTeaser = viewMode === "free";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleNarration = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const summaryLine = copy.results.narration.summary(report.domain, report.score);
    const leaksSummary =
      report.leaks.length > 0
        ? copy.results.narration.leaksFound(
            report.leaks.length,
            report.leaks
              .map((leak, idx) =>
                copy.results.narration.leakItem(idx + 1, leak.title, leak.whatIsWrong)
              )
              .join(". ")
          )
        : copy.results.narration.noLeaks;

    const utterance = new SpeechSynthesisUtterance(`${summaryLine} ${leaksSummary}`);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha"))
    );
    if (voice) utterance.voice = voice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_SMOOTH }}
    >
      <ScrollReveal>
        {!hideHeader && (
          <>
            <p className="label-caps mb-4 text-neon-green">
              {copy.results.intelligenceReady}
            </p>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <span className="font-heading text-3xl font-medium text-ghost-white md:text-4xl">
                {report.domain}
              </span>
              <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                {!isFreeTeaser && (
                  <a
                    href={`/api/reports/${report.id}/pdf`}
                    className="inline-flex items-center gap-2 rounded-lg border border-neon-green/30 bg-neon-green/10 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-neon-green transition-all hover:border-neon-green/50 hover:bg-neon-green/20"
                  >
                    <Download className="h-4 w-4" />
                    {copy.results.downloadPdf}
                  </a>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={toggleNarration}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet/30 bg-violet/10 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-violet-glow shadow-[0_0_15px_rgba(139,92,246,0.05)] transition-all hover:border-violet/50 hover:bg-violet/20"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4 animate-bounce text-neon-green" />
                      {copy.results.stopSpeech}
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 text-violet-glow" />
                      {copy.results.narrateReport}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              {copy.common.scannedPrefix}
              {new Date(report.scannedAt).toLocaleString()}
            </p>
          </>
        )}
        {hideHeader && !isFreeTeaser && (
          <div className="mb-8 flex flex-wrap justify-end gap-3">
            <a
              href={`/api/reports/${report.id}/pdf`}
              className="inline-flex items-center gap-2 rounded-lg border border-neon-green/30 bg-neon-green/10 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-neon-green transition-all hover:border-neon-green/50 hover:bg-neon-green/20"
            >
              <Download className="h-4 w-4" />
              {copy.results.downloadPdf}
            </a>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={toggleNarration}
              className="inline-flex items-center gap-2 rounded-lg border border-violet/30 bg-violet/10 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-violet-glow transition-all hover:border-violet/50 hover:bg-violet/20"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="h-4 w-4 animate-bounce text-neon-green" />
                  {copy.results.stopSpeech}
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-violet-glow" />
                  {copy.results.narrateReport}
                </>
              )}
            </motion.button>
          </div>
        )}
      </ScrollReveal>

      <p className="mt-5 rounded-lg border border-border/60 bg-surface px-4 py-3 text-xs leading-relaxed text-muted-light">AI audit based on accessible website content. Shopper perspectives are simulations; scores and findings do not measure real conversion rates or revenue. Verify the evidence before making changes.</p>

      {analyticsEvidence ? (
        <ScrollReveal className="mt-5">
          <AnalyticsEvidenceBanner evidence={analyticsEvidence} />
        </ScrollReveal>
      ) : null}

      {report.lowConfidence && report.confidenceNote && (
        <ScrollReveal className="mt-8">
          <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/[0.07] p-4 md:p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-warning">
                Limited visibility — results may be incomplete
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {report.confidenceNote}
              </p>
            </div>
          </div>
        </ScrollReveal>
      )}

      {!hideScore && (
        <ScrollReveal className={`flex justify-center ${compact ? "my-10 md:my-12" : "my-8 md:my-10"}`}>
          <div className="w-full max-w-5xl">
            <div className="flex justify-center">
              <GhostScore score={report.score} />
            </div>
            {report.scoreBreakdown && !isFreeTeaser ? (
              <details className="mt-6 rounded-xl border border-border px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-light">How this score was calculated</summary>
                <ScoreBreakdown breakdown={report.scoreBreakdown} />
              </details>
            ) : null}
          </div>
        </ScrollReveal>
      )}

      {analyticsEvidence ? (
        <ScrollReveal className="my-8">
          <AnalyticsSummaryCard evidence={analyticsEvidence} />
        </ScrollReveal>
      ) : !isFreeTeaser ? (
        <ScrollReveal className="my-8">
          <Ga4ConnectCta siteId={siteId} />
        </ScrollReveal>
      ) : null}

      {isFreeTeaser && (
        <ScrollReveal className="mt-8">
          <div className="rounded-xl border border-violet/30 bg-violet/5 p-5 text-sm text-muted-light">
            Free preview — upgrade to see every finding with persona quotes, suggested fixes, and PDF export.
          </div>
        </ScrollReveal>
      )}

      <div className={`space-y-10 ${compact ? "md:space-y-12" : "md:space-y-12"}`}>
        <div id="findings"><LeakCards leaks={report.leaks} teaserMode={isFreeTeaser} analyticsEvidence={analyticsEvidence} /></div>
        {!isFreeTeaser && (
          <div id="fixes">
            <FixCenter fixes={report.fixes} />
          </div>
        )}
        {!isFreeTeaser && <JourneyMap steps={report.journey} />}
        {!isFreeTeaser && <BusinessUnderstandingCard data={report.businessUnderstanding} />}
      </div>

      {showNewAnalysisCta && (
        <ScrollReveal className="mt-20 text-center md:mt-28">
          <SectionHeading size="lg" align="center" className="mb-8">
            {copy.results.scanAnotherHeading}{" "}
            <span className="text-gradient">{copy.results.scanAnotherAccent}</span>
          </SectionHeading>
          <div className="flex justify-center">
            <TextLink onClick={() => router.push(dashboardNewAuditHref())}>
              {copy.common.releaseGhostAgents}
            </TextLink>
          </div>
        </ScrollReveal>
      )}
    </motion.div>
  );
}
