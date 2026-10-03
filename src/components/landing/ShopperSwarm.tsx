"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Flame,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { Eyebrow, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";
import { useStartScan } from "@/hooks/useStartScan";
import { SHOPPERS } from "@/data/shopperData";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ShopperSwarm() {
  const [selectedId, setSelectedId] = useState(SHOPPERS[0].id);
  const reducedMotion = useReducedMotion();
  const startScan = useStartScan();

  const current = SHOPPERS.find((s) => s.id === selectedId) || SHOPPERS[0];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % SHOPPERS.length;
      setSelectedId(SHOPPERS[nextIndex].id);
      document.getElementById(`tab-${SHOPPERS[nextIndex].id}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + SHOPPERS.length) % SHOPPERS.length;
      setSelectedId(SHOPPERS[prevIndex].id);
      document.getElementById(`tab-${SHOPPERS[prevIndex].id}`)?.focus();
    }
  };

  return (
    <section
      id="shoppers"
      aria-labelledby="shoppers-section-title"
      className="product-section relative scroll-mt-32 sm:scroll-mt-40 bg-paper pt-20 pb-20 sm:pt-28 sm:pb-28"
    >
      <div className="product-container px-4 sm:px-6 lg:px-8">
        {/* 1. Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-3xl"
        >
          <Eyebrow dot>AI shopper swarm - 5 archetypes</Eyebrow>
          <h2
            id="shoppers-section-title"
            className="mt-3 display-lg font-heading text-ink"
          >
            Real customer psychology, simulated at <Serif>scale.</Serif>
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-graphite sm:text-[17px]">
            Ghost deploys AI mystery shoppers to walk your pages, test your pricing and document why real visitors abandon.
          </p>
        </motion.div>

        {/* 2. Archetype Tab Row */}
        <div className="mt-8 sm:mt-12">
          <div
            role="tablist"
            aria-label="Select an AI shopper archetype"
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {SHOPPERS.map((shopper, idx) => {
              const isSelected = shopper.id === selectedId;
              const TabIcon = shopper.icon;
              return (
                <button
                  key={shopper.id}
                  id={`tab-${shopper.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`panel-${shopper.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedId(shopper.id)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-3 rounded-[16px] border px-4 py-3.5 text-left transition-all duration-300 sm:px-5 sm:py-4 cursor-pointer",
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
                    <p className="mono-label truncate text-[12px] text-ash-text">
                      {shopper.focusArea}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.span
                      layoutId="shopper-active-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute -bottom-px left-4 right-4 h-[2.5px] rounded-full bg-ember"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Interactive Illustrated Card Display with Ghost Scan Sweep */}
        <div className="mt-8 max-w-[1140px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              id={`panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${current.id}`}
              className="grid gap-6 lg:grid-cols-2 items-start"
            >
              {/* Left Card: Archetype Persona & Telemetry */}
              <motion.div
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 14, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, scale: 0.985 }
                }
                transition={{ duration: 0.38, ease: EASE }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-paper p-6 sm:p-8 transition-transform duration-300 hover:scale-[1.006]"
              >
                {/* Top Section */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist/80 text-ink">
                        <current.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                          {current.name}
                        </h3>
                        <p className="mono-label text-[10px] font-semibold uppercase tracking-widest text-ash-text">
                          {current.role}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-graphite font-normal">
                      {current.trait}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ember">
                      <span className="h-2 w-2 rounded-full bg-ember animate-pulse" />
                      <span className="uppercase tracking-wider">{current.dropOffRate}</span>
                    </div>
                  </div>

                  {/* Character Cutout */}
                  <div className="relative shrink-0 w-36 sm:w-44 h-36 sm:h-44 pointer-events-none select-none">
                    <Image
                      src={current.charLeftImage}
                      alt={current.name}
                      width={589}
                      height={491}
                      priority
                      className="w-full h-full object-contain object-right-bottom drop-shadow-sm"
                    />
                  </div>
                </div>

                {/* Journey Stages Timeline */}
                <div className="mt-6 space-y-3.5 border-t border-line/60 pt-5">
                  {current.stages.map((stage, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                            stage.isFriction
                              ? "bg-ember-soft text-ember"
                              : "bg-mist text-ash-text"
                          )}
                        >
                          {stage.isFriction ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-medium text-[13px] leading-tight",
                              stage.isFriction ? "text-ember font-semibold" : "text-ink"
                            )}
                          >
                            {stage.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-graphite leading-normal">
                            {stage.detail}
                          </p>
                        </div>
                      </div>
                      {stage.time && (
                        <span className="mono-label shrink-0 text-[11px] text-ash-text tabular font-medium pt-0.5">
                          {stage.time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Bar */}
                <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-xs font-medium text-graphite">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-ash-text" />
                    <span>
                      PATIENCE:{" "}
                      <span className="font-semibold text-ink uppercase">
                        {current.patience}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ember">
                    <Flame className="h-3.5 w-3.5" />
                    <span>
                      FRICTION:{" "}
                      <span className="font-semibold uppercase">
                        {current.riskLevel}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Ghost Scan radar light sweep */}
                {!reducedMotion && (
                  <motion.div
                    key={`scan-left-${current.id}`}
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{
                      x: "220%",
                      opacity: [0, 0.45, 0.35, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.1,
                    }}
                    className="pointer-events-none absolute inset-y-0 w-36 -skew-x-12 bg-gradient-to-r from-transparent via-ember/20 to-transparent"
                    style={{ willChange: "transform" }}
                  />
                )}
              </motion.div>

              {/* Right Card: Customer Voice & Ghost Detection */}
              <motion.div
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 14, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, scale: 0.985 }
                }
                transition={{ duration: 0.38, delay: 0.05, ease: EASE }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-paper p-6 sm:p-8 transition-transform duration-300 hover:scale-[1.006]"
              >
                {/* Top: Customer Verbatim Quote with character cutout */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="relative">
                      <span className="font-serif text-3xl sm:text-4xl text-ember font-bold leading-none select-none">
                        “
                      </span>
                      <blockquote className="mt-1 text-sm sm:text-[15px] font-medium leading-relaxed text-ink italic">
                        {current.quote.replace(/^[“"]|[”"]$/g, "")}
                      </blockquote>
                    </div>
                  </div>

                  {/* Character Cutout */}
                  <div className="relative shrink-0 w-36 sm:w-44 h-36 sm:h-44 pointer-events-none select-none">
                    <Image
                      src={current.charRightImage}
                      alt="Ghost Detection Specialist"
                      width={426}
                      height={491}
                      priority
                      className="w-full h-full object-contain object-right-bottom drop-shadow-sm"
                    />
                  </div>
                </div>

                {/* Middle: Ghost Found Detection Block */}
                <div className="mt-6 rounded-2xl bg-mist/60 border border-line/70 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-ember">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="mono-label text-[10px] font-bold uppercase tracking-wider text-ember">
                      GHOST FOUND
                    </span>
                  </div>
                  <h4 className="mt-2 font-heading text-[15px] sm:text-[16px] font-semibold text-ink leading-snug">
                    {current.findingTitle}
                  </h4>
                  <p className="mt-1.5 text-[12px] sm:text-[13px] leading-relaxed text-graphite">
                    {current.findingDetail}
                  </p>

                  {/* Current Copy snippet */}
                  <div className="mt-3.5 rounded-lg bg-paper border border-line/60 p-2.5 sm:p-3">
                    <p className="mono-label text-[9px] uppercase tracking-wider text-ash-text">
                      {current.currentCopyLabel}
                    </p>
                    <p className="mt-1 font-mono text-[12px] sm:text-[13px] text-graphite font-medium break-words">
                      {current.currentCopy}
                    </p>
                  </div>
                </div>

                {/* Footer Bar: Projected Conversion Recovery */}
                <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-graphite">
                    <TrendingUp className="h-4 w-4 text-resolved" />
                    <span>Projected Conversion Recovery:</span>
                  </div>
                  <span className="font-heading font-bold text-sm sm:text-base text-resolved tabular">
                    {current.impactRecovery}
                  </span>
                </div>

                {/* Ghost Scan radar light sweep */}
                {!reducedMotion && (
                  <motion.div
                    key={`scan-right-${current.id}`}
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{
                      x: "220%",
                      opacity: [0, 0.45, 0.35, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.16,
                    }}
                    className="pointer-events-none absolute inset-y-0 w-36 -skew-x-12 bg-gradient-to-r from-transparent via-ember/20 to-transparent"
                    style={{ willChange: "transform" }}
                  />
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. Single CTA below the section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-12 flex justify-center"
        >
          <button
            type="button"
            onClick={startScan}
            className="group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-all duration-200 hover:bg-[#222328] active:scale-[0.98]"
          >
            <span>Simulate your website</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
