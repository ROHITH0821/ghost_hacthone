"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Smartphone,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";
import { useStartScan } from "@/hooks/useStartScan";
import { GhostMark } from "@/components/ui/GhostMark";

const EASE = [0.22, 1, 0.36, 1] as const;

interface LeakItem {
  id: string;
  title: string;
  category: string;
  icon: typeof DollarSign;
  dropOffRate: string;
  scorePenalty: number;
  rawSymptom: string;
  ghostFix: string;
  verbatim: string;
}

const LEAKS: LeakItem[] = [
  {
    id: "pricing-gate",
    title: "The Unanswered Price Gate",
    category: "Pricing & Transparency",
    icon: DollarSign,
    dropOffRate: "42% drop-off",
    scorePenalty: -18,
    rawSymptom:
      "Core services and flagship offerings display ‘Enquire for price’ without baseline figures or package deliverables.",
    ghostFix:
      "Transparent tiered pricing starting points with clear inclusion lists and custom quote options for bespoke jobs.",
    verbatim: "“I won’t fill out a contact form if I don't even know your ballpark price.”",
  },
  {
    id: "social-proof-void",
    title: "The Missing Proof Anchor",
    category: "Trust & Credibility",
    icon: ShieldCheck,
    dropOffRate: "31% drop-off",
    scorePenalty: -14,
    rawSymptom:
      "40+ verified 5-star Google reviews exist off-site, but zero testimonial evidence is placed within 400px of primary CTAs.",
    ghostFix:
      "Contextual customer validation badges and verified project outcome snippets embedded directly beside conversion buttons.",
    verbatim: "“There are no ratings or recent client photos here. How do I know you deliver?”",
  },
  {
    id: "mobile-form-exhaustion",
    title: "Mobile Form Exhaustion",
    category: "UX & Conversion Flow",
    icon: Smartphone,
    dropOffRate: "28% drop-off",
    scorePenalty: -12,
    rawSymptom:
      "7 mandatory form fields on mobile screens with sluggish dropdowns and no WhatsApp or single-tap contact alternative.",
    ghostFix:
      "2-step micro-inquiry flow with browser autofill support and a 1-tap WhatsApp consultation launch.",
    verbatim: "“Typing my whole address and timeline on a phone keyboard was too tedious.”",
  },
  {
    id: "vitals-render-stall",
    title: "Silent Render Delay & Shift",
    category: "Core Web Vitals",
    icon: Zap,
    dropOffRate: "19% drop-off",
    scorePenalty: -8,
    rawSymptom:
      "3.9s Largest Contentful Paint (LCP) and jarring cumulative layout shift pushing action buttons during page load.",
    ghostFix:
      "Preloaded modern image formats, reserved layout aspect ratios, and deferred third-party script executions.",
    verbatim: "“The screen froze while loading, and when I tried to tap, the page jumped.”",
  },
];

export function FrictionMatrix() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [activeLeakId, setActiveLeakId] = useState(LEAKS[0].id);
  const reduced = useReducedMotion();
  const startScan = useStartScan();

  const score = isOptimized ? 94 : 54;
  const activeLeak = LEAKS.find((l) => l.id === activeLeakId) || LEAKS[0];

  return (
    <section
      id="leaks"
      aria-labelledby="leaks-section-title"
      className="section-pad product-section relative scroll-mt-28 border-t border-line bg-paper py-24 sm:py-32"
    >
      <span id="pricing" className="pointer-events-none absolute -top-28 block opacity-0" aria-hidden />
      <div className="product-container">
        {/* Section Header */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow dot>Conversion Leak Engine · Interactive Diagnostic</Eyebrow>
            </Reveal>
            <MaskLines
              id="leaks-section-title"
              className="display-lg font-heading text-ink"
              lines={[
                "Where websites lose",
                <>
                  customers in <Serif>silence.</Serif>
                </>,
              ]}
            />
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-graphite">
              Google Analytics reports that visitors left. Ghost diagnoses the exact psychological
              and technical friction traps that pushed them away — and models the conversion lift
              when resolved.
            </p>
          </Reveal>
        </div>

        {/* Interactive Mode Simulator Bar */}
        <Reveal delay={0.15} className="mt-12 sm:mt-16">
          <div className="flex flex-col gap-6 rounded-[22px] border border-line bg-mist/60 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-ember" />
                <span className="mono-label text-[11px] text-ink font-semibold">
                  Live Conversion Friction Simulator
                </span>
              </div>
              <p className="mt-1 text-sm text-graphite">
                Toggle between your website’s raw friction state and the Ghost AI sealed optimization.
              </p>
            </div>

            {/* State Toggle Buttons */}
            <div className="flex items-center rounded-full border border-line bg-paper p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setIsOptimized(false)}
                className={cn(
                  "mono-label flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] transition-all",
                  !isOptimized
                    ? "bg-ink text-paper shadow-xs"
                    : "text-ash-text hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    !isOptimized ? "bg-ember animate-pulse" : "bg-ash"
                  )}
                />
                Raw Site (Silent Leaks)
              </button>
              <button
                type="button"
                onClick={() => setIsOptimized(true)}
                className={cn(
                  "mono-label flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] transition-all",
                  isOptimized
                    ? "bg-resolved text-paper shadow-xs"
                    : "text-ash-text hover:text-ink",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ghost AI Optimized
              </button>
            </div>
          </div>
        </Reveal>

        {/* Live Simulation Matrix */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Animated Ghost Score Gauge & Metric Telemetry */}
          <Reveal delay={0.2} className="lg:col-span-4">
            <div className="flex flex-col rounded-[22px] border border-line bg-paper p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="mono-label text-[10px] text-ash-text">Ghost Audit Rating</span>
                <span
                  className={cn(
                    "mono-label rounded-full px-2.5 py-0.5 text-[10px]",
                    isOptimized
                      ? "bg-resolved/10 text-resolved-text font-medium"
                      : "bg-ember-soft text-ember-text font-medium",
                  )}
                >
                  {isOptimized ? "Protected" : "Friction Alert"}
                </span>
              </div>

              {/* Animated Circular Score Dial */}
              <div className="my-8 flex flex-col items-center justify-center">
                <div className="relative flex h-44 w-44 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="fill-none stroke-line"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r="50"
                      className={cn(
                        "fill-none transition-colors duration-500",
                        isOptimized ? "stroke-resolved" : "stroke-ember",
                      )}
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeLinecap="round"
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 50 * (1 - score / 100),
                      }}
                      transition={{ duration: 0.9, ease: EASE }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      key={score}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="tabular font-heading text-5xl font-semibold tracking-[-0.04em] text-ink"
                    >
                      {score}
                    </motion.span>
                    <span className="mono-label text-[10px] text-ash-text">out of 100</span>
                  </div>
                </div>

                <motion.p
                  key={isOptimized ? "opt" : "raw"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "mt-4 text-center text-sm font-medium",
                    isOptimized ? "text-resolved-text" : "text-ember-text",
                  )}
                >
                  {isOptimized
                    ? "Optimal conversion velocity achieved"
                    : "4 silent conversion leaks degrading conversion rate"}
                </motion.p>
              </div>

              {/* 3 Telemetry Counters */}
              <div className="space-y-3.5 border-t border-line pt-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-graphite">Visitor Drop-Off Friction</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ember-text",
                    )}
                  >
                    {isOptimized ? "18% (Low)" : "64% (Severe)"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-graphite">Decision Hesitation Time</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ink",
                    )}
                  >
                    {isOptimized ? "0.9 seconds" : "4.8 seconds"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-graphite">Estimated Revenue Retained</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ash-text",
                    )}
                  >
                    {isOptimized ? "+₹1,85,000 / mo" : "₹0 (Lost to leaks)"}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right Column: 4 Interactive Conversion Leak Cards */}
          <Reveal delay={0.25} className="lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {LEAKS.map((leak) => {
                const isSelected = leak.id === activeLeakId;
                const LeakIcon = leak.icon;
                return (
                  <div
                    key={leak.id}
                    onClick={() => setActiveLeakId(leak.id)}
                    className={cn(
                      "cursor-pointer rounded-[18px] border p-6 transition-all duration-300",
                      isSelected
                        ? "border-ink bg-paper shadow-[var(--shadow-soft)] ring-1 ring-ink/10"
                        : "border-line bg-paper hover:border-[#C9CAC4] hover:bg-mist/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-full transition-colors",
                          isOptimized
                            ? "bg-resolved/10 text-resolved-text"
                            : "bg-ember-soft text-ember-text",
                        )}
                      >
                        <LeakIcon className="h-5 w-5" />
                      </div>
                      <span
                        className={cn(
                          "mono-label rounded-full px-2.5 py-1 text-[9px] font-medium transition-colors",
                          isOptimized
                            ? "bg-resolved/10 text-resolved-text"
                            : "bg-mist text-ash-text",
                        )}
                      >
                        {isOptimized ? "Leak Sealed" : leak.dropOffRate}
                      </span>
                    </div>

                    <h4 className="mt-4 font-heading text-[17px] font-medium tracking-[-0.02em] text-ink">
                      {leak.title}
                    </h4>
                    <p className="mono-label mt-1 text-[10px] text-ash-text">
                      {leak.category}
                    </p>

                    <AnimatePresence mode="wait">
                      {!isOptimized ? (
                        <motion.div
                          key="raw"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 border-t border-line/60 pt-3"
                        >
                          <p className="text-[13px] leading-relaxed text-graphite">
                            {leak.rawSymptom}
                          </p>
                          <p className="mt-2.5 text-xs italic text-ember-text">
                            {leak.verbatim}
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="fixed"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 border-t border-resolved/20 pt-3"
                        >
                          <p className="text-[13px] leading-relaxed text-graphite">
                            {leak.ghostFix}
                          </p>
                          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-resolved-text">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Conversion blocker permanently removed
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Strip */}
            <div className="mt-6 flex flex-col gap-4 rounded-[18px] border border-line bg-mist/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper">
                  <GhostMark className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-medium text-ink">
                    Inspect your website for silent drop-offs
                  </p>
                  <p className="text-xs text-graphite">
                    No scripts or code to install. Ghost audits your site purely from the outside.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={startScan}
                className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-all hover:bg-[#222328] active:scale-[0.98]"
              >
                <span>Run Free Mystery Audit</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
