"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
                className="group relative overflow-hidden rounded-[24px] transition-transform duration-300 hover:scale-[1.008]"
              >
                <Image
                  src={current.leftImage}
                  alt={`${current.name} Journey Telemetry`}
                  width={1014}
                  height={910}
                  priority
                  className="w-full h-auto object-contain block select-none"
                  style={{
                    imageRendering: "auto",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                  draggable={false}
                />

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
                className="group relative overflow-hidden rounded-[24px] transition-transform duration-300 hover:scale-[1.008]"
              >
                <Image
                  src={current.rightImage}
                  alt={`${current.name} Customer Voice & Ghost Detection`}
                  width={1014}
                  height={910}
                  priority
                  className="w-full h-auto object-contain block select-none"
                  style={{
                    imageRendering: "auto",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                  draggable={false}
                />

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
