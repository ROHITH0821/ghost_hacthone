"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, Copy, TrendingDown, Wrench, BarChart3, Activity, Sparkles, Lightbulb } from "lucide-react";
import type { ConversionLeak } from "@/lib/types";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { SEVERITY_CONFIG } from "@/lib/constants";
import { SectionHeading, SectionLabel } from "@/components/ui/BRAVE";
import { copy } from "@/lib/copy";

interface LeakCardsProps {
  leaks: ConversionLeak[];
  teaserMode?: boolean;
  analyticsEvidence?: ExternalEvidence | null;
}

export function LeakCards({ leaks, teaserMode = false, analyticsEvidence }: LeakCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const copyFix = async (id: string, content: string) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopyError("Could not copy. Select the draft text and copy it manually.");
    }
  };

  return (
    <section>
      {copyError && <p role="alert" className="mb-4 text-sm text-danger">{copyError}</p>}
      <SectionLabel>{copy.results.leaks.label}</SectionLabel>
      <div className="mb-10 flex items-end justify-between gap-4">
        <SectionHeading size="lg">
          Findings to <span className="text-gradient">prioritize</span>
        </SectionHeading>
        <span className="shrink-0 text-sm text-muted">
          {copy.common.issuesCount(leaks.length)}
        </span>
      </div>

      <div className="space-y-4">
        {leaks.map((leak, index) => {
          const severity = SEVERITY_CONFIG[leak.severity];
          const isOpen = openId === leak.id;
          return (
            <motion.div
              key={leak.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: index * 0.1,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div
                className="brave-card overflow-hidden"
                style={{ borderColor: severity.border }}
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: severity.bg }}
                    >
                      <AlertTriangle
                        className="h-5 w-5"
                        style={{ color: severity.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-ghost-white md:text-xl">
                          {leak.title}
                        </h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: severity.bg,
                            color: severity.color,
                          }}
                        >
                          {severity.label}
                        </span>
                        {analyticsEvidence?.priorityFindingIds?.includes(leak.id) && (
                          <span className="flex items-center gap-1 rounded-full border border-neon-green/30 bg-neon-green/10 px-2 py-0.5 text-[10px] font-semibold text-neon-green uppercase tracking-wider">
                            <Activity className="h-3 w-3" />
                            High Traffic Impact
                          </span>
                        )}
                      </div>
                      <span className="mt-1 inline-block text-xs text-muted">
                        {leak.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-midnight/50 p-4">
                      <p className="label-caps mb-2">
                        {copy.results.leaks.whatsWrong}
                      </p>
                      <p className="text-sm leading-relaxed text-muted">
                        {leak.whatIsWrong}
                      </p>
                    </div>
                    <div className="rounded-xl bg-midnight/50 p-4">
                      <p className="label-caps mb-2">
                        {copy.results.leaks.whyTheyGhost}
                      </p>
                      <p className="text-sm leading-relaxed text-muted">
                        {leak.whyCustomersLeave}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                    <TrendingDown
                      className="h-4 w-4"
                      style={{ color: severity.color }}
                    />
                    {leak.impact}
                  </div>

                  {/* GA4 Behavioural Evidence */}
                  {(() => {
                    const findingEv = analyticsEvidence?.findings?.find((f) => f.findingId === leak.id);
                    if (!findingEv) return null;
                    return (
                      <div className="mt-4 overflow-hidden rounded-xl border border-violet/30 bg-violet/5 p-4">
                        <div className="flex items-center justify-between gap-2 border-b border-violet/15 pb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-violet">
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Verified with GA4</span>
                            <span className="font-mono text-[11px] text-muted font-normal">({findingEv.path})</span>
                          </div>
                          <span className="rounded bg-violet/20 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-violet uppercase">
                            Data Layer
                          </span>
                        </div>

                        <div className="mt-3 space-y-2.5 text-xs">
                          {/* Actual Data */}
                          <div className="flex items-start gap-2 text-ghost-white/90">
                            <span className="shrink-0 rounded bg-midnight/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-neon-green uppercase">
                              Data
                            </span>
                            <p className="leading-relaxed">
                              {findingEv.views !== null && (
                                <span><strong>{findingEv.views.toLocaleString()}</strong> views</span>
                              )}
                              {findingEv.landingSessions !== null && (
                                <span> · <strong>{findingEv.landingSessions.toLocaleString()}</strong> landing sessions</span>
                              )}
                              {findingEv.engagementRate !== null && (
                                <span> · <strong>{(findingEv.engagementRate <= 1 ? findingEv.engagementRate * 100 : findingEv.engagementRate).toFixed(1)}%</strong> engagement rate</span>
                              )}
                              {findingEv.sessionKeyEventRate !== null && (
                                <span> · <strong>{(findingEv.sessionKeyEventRate <= 1 ? findingEv.sessionKeyEventRate * 100 : findingEv.sessionKeyEventRate).toFixed(2)}%</strong> conversion rate</span>
                              )}
                            </p>
                          </div>

                          {/* Observation */}
                          {findingEv.observation && (
                            <div className="flex items-start gap-2 text-muted-light">
                              <span className="shrink-0 rounded bg-midnight/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet uppercase">
                                Obs
                              </span>
                              <p className="leading-relaxed">{findingEv.observation}</p>
                            </div>
                          )}

                          {/* AI Interpretation */}
                          {findingEv.interpretation && (
                            <div className="flex items-start gap-2 text-muted">
                              <span className="shrink-0 rounded bg-midnight/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sev-medium-text uppercase">
                                Interp
                              </span>
                              <p className="leading-relaxed">{findingEv.interpretation}</p>
                            </div>
                          )}

                          {/* Recommendation */}
                          {findingEv.recommendation && (
                            <div className="flex items-start gap-2 text-ghost-white/80">
                              <span className="shrink-0 rounded bg-midnight/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-neon-green uppercase">
                                Rec
                              </span>
                              <p className="leading-relaxed">{findingEv.recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* How-to-fix dropdown */}
                  <div className="mt-4 overflow-hidden rounded-xl border border-neon-green/10 bg-neon-green/5">
                    <button
                      type="button"
                      onClick={() => toggle(leak.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neon-green/[0.08]"
                    >
                      <Wrench className="h-4 w-4 shrink-0 text-neon-green" />
                      <span className="label-caps flex-1 text-neon-green/70">
                        {copy.results.leaks.howToFix}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-neon-green/70 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <p className="text-sm leading-relaxed text-muted">
                              {leak.howToFix}
                            </p>

                            {leak.fix && (
                              <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-xs font-semibold text-ghost-white/80">
                                    {leak.fix.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyFix(leak.id, leak.fix!.content)}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-violet/30 hover:text-ghost-white"
                                  >
                                    {copiedId === leak.id ? (
                                      <Check className="h-3.5 w-3.5 text-neon-green" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copiedId === leak.id
                                      ? copy.common.copied
                                      : copy.common.copy}
                                  </button>
                                </div>
                                <div className="rounded-lg bg-midnight p-4 font-mono text-xs leading-relaxed">
                                  <pre className="whitespace-pre-wrap text-muted">
                                    {leak.fix.content}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
