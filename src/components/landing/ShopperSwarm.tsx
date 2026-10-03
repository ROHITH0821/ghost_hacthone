"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Wallet,
  ShieldAlert,
  Zap,
  Compass,
  Scale,
  ArrowRight,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";
import { useStartScan } from "@/hooks/useStartScan";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ShopperPersona {
  id: string;
  name: string;
  role: string;
  icon: typeof Wallet;
  trait: string;
  patience: "Zero" | "Low" | "Medium" | "High";
  riskLevel: "Critical" | "High" | "Medium";
  dropOffRate: string;
  focusArea: string;
  quote: string;
  stages: Array<{
    title: string;
    detail: string;
    time: string;
    isFriction?: boolean;
  }>;
  findingTitle: string;
  findingDetail: string;
  beforeSnippet: { label: string; value: string };
  afterSnippet: { label: string; value: string };
  impactRecovery: string;
}

const SHOPPERS: ShopperPersona[] = [
  {
    id: "budget-hunter",
    name: "Budget Hunter",
    role: "Cost-conscious buyer",
    icon: Wallet,
    trait: "Zero tolerance for unlisted prices",
    patience: "Low",
    riskLevel: "Critical",
    dropOffRate: "74% bounce risk",
    focusArea: "Price Transparency",
    quote:
      "“Your services page lists 9 treatments and prices only 3. I wanted the bridal package, but having to ‘enquire for pricing’ made me bounce immediately to a competitor.”",
    stages: [
      { title: "Landing Entry", detail: "Arrives on Services page from search", time: "0.0s" },
      { title: "Catalog Scan", detail: "Browses 9 listed beauty packages", time: "+14s" },
      {
        title: "Price Omission Encounter",
        detail: "Finds 'Contact for details' on top tier",
        time: "+28s",
        isFriction: true,
      },
      {
        title: "Session Abandoned",
        detail: "Leaves site without filling inquiry form",
        time: "+39s",
        isFriction: true,
      },
    ],
    findingTitle: "High-value offer concealed behind contact gate",
    findingDetail:
      "Customers willing to spend high tickets want immediate budget confirmation before committing their contact details.",
    beforeSnippet: {
      label: "Current Site Copy",
      value: "Bridal Package — Contact for details & custom quote",
    },
    afterSnippet: {
      label: "Ghost Suggested Fix",
      value: "Bridal Package — From ₹12,500 · Includes hair, makeup & trial",
    },
    impactRecovery: "+38% inquiry conversions",
  },
  {
    id: "trust-skeptic",
    name: "Trust Skeptic",
    role: "First-time visitor",
    icon: ShieldAlert,
    trait: "Demands verifiable third-party proof",
    patience: "Medium",
    riskLevel: "Critical",
    dropOffRate: "68% bounce risk",
    focusArea: "Credibility & Social Proof",
    quote:
      "“The About section is one short paragraph with no Google ratings or verified client photos. I had no idea if your business was real or an abandoned studio.”",
    stages: [
      { title: "Ad Click", detail: "Lands on primary homepage hero", time: "0.0s" },
      { title: "Proof Hunting", detail: "Looks for real client reviews or awards", time: "+11s" },
      {
        title: "Credibility Void",
        detail: "Zero reviews or ratings visible above fold",
        time: "+24s",
        isFriction: true,
      },
      {
        title: "Exit Tab",
        detail: "Closes tab to search for reviewed alternatives",
        time: "+36s",
        isFriction: true,
      },
    ],
    findingTitle: "Existing Google proof never reaches first-time visitors",
    findingDetail:
      "Proof exists on external platforms but is never placed beside conversion CTAs where visitors make trust decisions.",
    beforeSnippet: {
      label: "Current Site Copy",
      value: "“We are dedicated to providing premier experiences for you.”",
    },
    afterSnippet: {
      label: "Ghost Suggested Fix",
      value: "“Rated 4.8★ by 140+ verified clients on Google Reviews”",
    },
    impactRecovery: "+44% trust confidence",
  },
  {
    id: "speed-runner",
    name: "Speed Runner",
    role: "Mobile commuter",
    icon: Zap,
    trait: "Abandons on layout shift or lag",
    patience: "Zero",
    riskLevel: "High",
    dropOffRate: "59% bounce risk",
    focusArea: "Mobile Performance & CLS",
    quote:
      "“Your hero image took 4.6 seconds to render on my phone. When the booking button finally appeared, a banner jumped down and made me misclick. I gave up.”",
    stages: [
      { title: "Mobile Tap", detail: "Clicks direct link on mobile browser", time: "0.0s" },
      {
        title: "LCP Render Stall",
        detail: "3.9s blank hero viewport on cellular connection",
        time: "+3.9s",
        isFriction: true,
      },
      {
        title: "Layout Shift",
        detail: "Banner pop-in triggers misclick on CTA button",
        time: "+5.1s",
        isFriction: true,
      },
      {
        title: "Instant Back-Swipe",
        detail: "Customer returns to search results",
        time: "+5.8s",
        isFriction: true,
      },
    ],
    findingTitle: "Cumulative layout shift & uncompressed asset delay",
    findingDetail:
      "Mobile shoppers on cellular connections abandon within 3 seconds if core CTAs shift or delay rendering.",
    beforeSnippet: {
      label: "Current Asset Payload",
      value: "Raw 4.2MB PNG hero image · Uncached third-party scripts",
    },
    afterSnippet: {
      label: "Ghost Suggested Fix",
      value: "Responsive WebP (84KB) + CSS aspect-ratio containment",
    },
    impactRecovery: "Load time: 4.6s → 0.7s",
  },
  {
    id: "lost-explorer",
    name: "Lost Explorer",
    role: "Task-oriented shopper",
    icon: Compass,
    trait: "Frustrated by circular navigation",
    patience: "Medium",
    riskLevel: "Medium",
    dropOffRate: "52% bounce risk",
    focusArea: "Information Architecture",
    quote:
      "“I clicked Services, then Packages, then Offers, and somehow ended up right back on the homepage. Why is the booking form hidden under three dropdowns?”",
    stages: [
      { title: "Targeted Search", detail: "Enters site specifically looking to book", time: "0.0s" },
      { title: "Menu Maze", detail: "Navigates 3 nested dropdown hierarchies", time: "+16s" },
      {
        title: "Circular Redirect",
        detail: "Links loop back to parent category without CTA",
        time: "+31s",
        isFriction: true,
      },
      {
        title: "Fatigue Drop-off",
        detail: "Gives up trying to locate direct schedule button",
        time: "+44s",
        isFriction: true,
      },
    ],
    findingTitle: "Buried conversion path with recursive link loops",
    findingDetail:
      "Complex site navigation forces visitors to perform mental gymnastics instead of offering a direct one-click action.",
    beforeSnippet: {
      label: "Current Menu Hierarchy",
      value: "Home → Menu → Offerings → Special Packages → Details (No CTA)",
    },
    afterSnippet: {
      label: "Ghost Suggested Fix",
      value: "Sticky Global Header with primary “Book Now” direct action",
    },
    impactRecovery: "Path to action cut by 65%",
  },
  {
    id: "comparison-hawk",
    name: "Comparison Hawk",
    role: "Diligence shopper",
    icon: Scale,
    trait: "Evaluates 3 competitor tabs at once",
    patience: "High",
    riskLevel: "High",
    dropOffRate: "63% bounce risk",
    focusArea: "Competitive Differentiation",
    quote:
      "“You say ‘premium quality’ multiple times, but never explain what makes you different from the provider next door. The other tab outlined their guarantee in 5 seconds.”",
    stages: [
      { title: "Tab Comparison", detail: "Opens site alongside 2 local competitors", time: "0.0s" },
      { title: "Value Scan", detail: "Reads marketing copy looking for unique edge", time: "+18s" },
      {
        title: "Generic Claims",
        detail: "Encountered vague buzzwords without specific proof",
        time: "+33s",
        isFriction: true,
      },
      {
        title: "Tab Switch",
        detail: "Switches to competitor offering explicit guarantees",
        time: "+47s",
        isFriction: true,
      },
    ],
    findingTitle: "Generic value proposition without competitive moats",
    findingDetail:
      "Visitors comparing alternatives need concrete differentiators, guarantees, and exact turn-around times.",
    beforeSnippet: {
      label: "Current Site Copy",
      value: "“We offer high quality solutions tailored to your unique needs.”",
    },
    afterSnippet: {
      label: "Ghost Suggested Fix",
      value: "“100% Satisfaction Guarantee · 48-Hour Turnaround · No Retainers”",
    },
    impactRecovery: "+31% competitive win rate",
  },
];

export function ShopperSwarm() {
  const [selectedId, setSelectedId] = useState(SHOPPERS[0].id);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [showFix, setShowFix] = useState(false);
  const reduced = useReducedMotion();
  const startScan = useStartScan();

  const current = SHOPPERS.find((s) => s.id === selectedId) || SHOPPERS[0];
  const IconComponent = current.icon;

  return (
    <section
      id="shoppers"
      aria-labelledby="shoppers-section-title"
      className="section-pad product-section scroll-mt-28 border-t border-line bg-mist/40 py-24 sm:py-32"
    >
      <div className="product-container">
        {/* Section Header */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow dot>AI Shopper Swarm · 5 Psychological Archetypes</Eyebrow>
            </Reveal>
            <MaskLines
              id="shoppers-section-title"
              className="display-lg font-heading text-ink"
              lines={[
                "Real customer psychology,",
                <>
                  simulated at <Serif>scale.</Serif>
                </>,
              ]}
            />
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-graphite">
              Ghost deploys specialized AI mystery shoppers to walk your pages, test your pricing,
              and document unfiltered reasons why real visitors abandon.
            </p>
            <div className="mt-4 flex items-center gap-3 text-[13px] text-ash-text">
              <span className="ember-dot !h-1.5 !w-1.5" />
              <span>Simulated journeys reveal silent conversion leaks in real time</span>
            </div>
          </Reveal>
        </div>

        {/* Interactive Shopper Archetype Tabs */}
        <Reveal delay={0.15} className="mt-12 sm:mt-16">
          <div
            role="tablist"
            aria-label="Select an AI shopper persona to simulate"
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {SHOPPERS.map((shopper) => {
              const isSelected = shopper.id === selectedId;
              const TabIcon = shopper.icon;
              return (
                <button
                  key={shopper.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedId(shopper.id);
                    setShowFix(false);
                  }}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-3 rounded-[16px] border px-4 py-3.5 text-left transition-all duration-300 sm:px-5 sm:py-4",
                    isSelected
                      ? "border-ink bg-paper text-ink shadow-[var(--shadow-soft)]"
                      : "border-line bg-paper/60 text-graphite hover:border-[#C9CAC4] hover:bg-paper hover:text-ink",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors",
                      isSelected
                        ? "bg-ink text-paper"
                        : "bg-mist text-graphite group-hover:bg-line/70 group-hover:text-ink",
                    )}
                  >
                    <TabIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-[15px] font-medium tracking-[-0.02em] text-ink">
                      {shopper.name}
                    </p>
                    <p className="mono-label truncate text-[10px] text-ash-text">
                      {shopper.focusArea}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.span
                      layoutId="shopper-active-indicator"
                      transition={{ duration: 0.35, ease: EASE }}
                      className="absolute -bottom-px left-4 right-4 h-[2.5px] rounded-full bg-ember"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Live Simulation Stage (Animated Bento) */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="grid gap-6 lg:grid-cols-12"
            >
              {/* Left Column: Shopper Journey Simulation Card */}
              <div className="flex flex-col justify-between rounded-[20px] border border-line bg-paper p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:col-span-5">
                <div>
                  {/* Shopper Header */}
                  <div className="flex items-center justify-between border-b border-line pb-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-spectral text-ink">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-lg font-medium tracking-[-0.02em] text-ink">
                            {current.name}
                          </h3>
                          <span className="mono-label rounded-full bg-mist px-2 py-0.5 text-[9px] text-ash-text">
                            {current.role}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-graphite">{current.trait}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="mono-label inline-flex items-center gap-1.5 rounded-full border border-ember/25 bg-ember-soft px-2.5 py-1 text-[10px] text-ember-text">
                        <span className="ember-dot !h-1.5 !w-1.5" />
                        {current.dropOffRate}
                      </span>
                    </div>
                  </div>

                  {/* 4-Stage Animated Journey Stepper */}
                  <div className="mt-6">
                    <p className="mono-label text-[10px] text-ash-text">
                      Simulated Journey Telemetry
                    </p>
                    <ol className="relative mt-4 space-y-4">
                      {current.stages.map((stage, idx) => {
                        const isLast = idx === current.stages.length - 1;
                        return (
                          <motion.li
                            key={stage.title}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: idx * 0.08, ease: EASE }}
                            className="relative flex items-start gap-3.5"
                          >
                            {!isLast && (
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute left-[13px] top-6 h-[calc(100%+8px)] w-0.5",
                                  stage.isFriction ? "bg-ember/40" : "bg-line",
                                )}
                              />
                            )}
                            <div
                              className={cn(
                                "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-mono",
                                stage.isFriction
                                  ? "border-ember bg-ember-soft text-ember-text font-bold"
                                  : "border-line bg-mist text-graphite",
                              )}
                            >
                              {stage.isFriction ? "!" : String(idx + 1)}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={cn(
                                    "font-heading text-sm font-medium",
                                    stage.isFriction ? "text-ember-text" : "text-ink",
                                  )}
                                >
                                  {stage.title}
                                </p>
                                <span className="mono-label tabular text-[10px] text-ash-text">
                                  {stage.time}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-graphite">{stage.detail}</p>
                            </div>
                          </motion.li>
                        );
                      })}
                    </ol>
                  </div>
                </div>

                {/* Telemetry Footer */}
                <div className="mt-8 rounded-[14px] border border-line bg-mist/70 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="mono-label text-[10px] text-ash-text">Patience Threshold</span>
                    <span className="font-medium text-ink">{current.patience}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="mono-label text-[10px] text-ash-text">Friction Severity</span>
                    <span className="font-semibold text-ember-text">{current.riskLevel}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="mono-label text-[10px] text-ash-text">Audit Engine</span>
                    <span className="mono-label text-[10px] text-graphite">Ghost Mystery Swarm v1.0</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Verbatim Quote & Live Ghost Fix */}
              <div className="flex flex-col justify-between rounded-[20px] border border-line bg-paper p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:col-span-7">
                <div>
                  {/* Quote Header with Simulated Voice Wave */}
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-2">
                      <span className="mono-label text-[10px] text-ash-text">
                        Simulated Customer Voice · Unfiltered Feedback
                      </span>
                    </div>

                    {/* Voice equalizer animation */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        aria-label={isPlayingAudio ? "Mute audio visualization" : "Unmute audio visualization"}
                        className="flex items-center gap-2 rounded-full border border-line bg-mist px-2.5 py-1 text-[11px] text-graphite transition-colors hover:text-ink"
                      >
                        {isPlayingAudio ? (
                          <Volume2 className="h-3.5 w-3.5 text-ember" />
                        ) : (
                          <VolumeX className="h-3.5 w-3.5 text-ash-text" />
                        )}
                        <span className="mono-label text-[9px]">
                          {isPlayingAudio ? "Audio Feed Active" : "Paused"}
                        </span>
                      </button>

                      <div className="flex h-4 items-center gap-1" aria-hidden>
                        {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.3].map((height, i) => (
                          <motion.span
                            key={i}
                            animate={
                              isPlayingAudio && !reduced
                                ? { scaleY: [0.3, height, 0.3] }
                                : { scaleY: 0.3 }
                            }
                            transition={{
                              duration: 0.9 + i * 0.1,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="w-0.5 rounded-full bg-ember origin-bottom h-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Verbatim Monologue */}
                  <blockquote className="my-6 sm:my-8">
                    <p className="serif-accent text-[clamp(22px,2.4vw,32px)] leading-[1.25] text-ink">
                      {current.quote}
                    </p>
                    <footer className="mt-4 flex items-center gap-2 text-xs text-graphite">
                      <span className="h-1.5 w-1.5 rounded-full bg-ember" />
                      <span>Verbatim transcript recorded during simulated checkout walkthrough</span>
                    </footer>
                  </blockquote>

                  {/* Ghost Diagnosis & Fix Module */}
                  <div className="rounded-[16px] border border-line bg-mist p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="mono-label inline-flex items-center gap-1.5 text-[10px] text-ember-text font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          Ghost Detection
                        </span>
                        <h4 className="mt-1 font-heading text-base font-medium tracking-[-0.02em] text-ink">
                          {current.findingTitle}
                        </h4>
                      </div>

                      {/* Before / After Toggle */}
                      <div className="flex rounded-full border border-line bg-paper p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setShowFix(false)}
                          className={cn(
                            "mono-label min-h-7 rounded-full px-3 text-[10px] transition-all",
                            !showFix ? "bg-ink text-paper" : "text-ash-text hover:text-ink",
                          )}
                        >
                          Problem Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFix(true)}
                          className={cn(
                            "mono-label min-h-7 rounded-full px-3 text-[10px] transition-all",
                            showFix ? "bg-ember text-paper" : "text-ash-text hover:text-ink",
                          )}
                        >
                          Ghost AI Fix
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-[14px] leading-relaxed text-graphite">
                      {current.findingDetail}
                    </p>

                    {/* Code Diff Display */}
                    <div className="mt-4 overflow-hidden rounded-[12px] border border-line bg-paper p-4 font-mono text-xs">
                      <AnimatePresence mode="wait">
                        {!showFix ? (
                          <motion.div
                            key="before"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 text-ember-text"
                          >
                            <span className="shrink-0 select-none font-bold">−</span>
                            <div className="min-w-0 flex-1">
                              <p className="mono-label text-[9px] text-ash-text uppercase tracking-wider">
                                {current.beforeSnippet.label}
                              </p>
                              <p className="mt-1 break-words font-sans text-sm font-medium text-ink">
                                {current.beforeSnippet.value}
                              </p>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="after"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 text-resolved-text"
                          >
                            <span className="shrink-0 select-none font-bold">+</span>
                            <div className="min-w-0 flex-1">
                              <p className="mono-label text-[9px] text-resolved-text uppercase tracking-wider">
                                {current.afterSnippet.label}
                              </p>
                              <p className="mt-1 break-words font-sans text-sm font-medium text-ink">
                                {current.afterSnippet.value}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                      <span className="text-graphite">Projected Conversion Recovery:</span>
                      <span className="font-heading font-medium text-resolved-text">
                        {current.impactRecovery}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call to Action Bar */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                  <p className="text-[13px] text-graphite">
                    Ready to see how AI shoppers experience your website?
                  </p>
                  <button
                    type="button"
                    onClick={startScan}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition-all duration-200 hover:bg-[#222328] active:scale-[0.98]"
                  >
                    <span>Simulate your website</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
