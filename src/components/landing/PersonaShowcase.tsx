"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/BRAVE";
import { HorizontalScrollTrack } from "@/components/ui/HorizontalScrollTrack";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";

const personaEmojis = ["💰", "🔍", "✨", "⚡", "🧭", "⚖️", "⏱️", "📶"] as const;

const personaAccents = [
  { color: "#38BDF8", glow: "rgba(56, 189, 248, 0.15)" },
  { color: "#A78BFA", glow: "rgba(167, 139, 250, 0.15)" },
  { color: "#8B5CF6", glow: "rgba(139, 92, 246, 0.15)" },
  { color: "#22C55E", glow: "rgba(34, 197, 94, 0.15)" },
  { color: "#F59E0B", glow: "rgba(245, 158, 11, 0.15)" },
  { color: "#F472B6", glow: "rgba(244, 114, 182, 0.15)" },
  { color: "#FB7185", glow: "rgba(251, 113, 133, 0.15)" },
  { color: "#2DD4BF", glow: "rgba(45, 212, 191, 0.15)" },
] as const;

const personas = copy.landing.personas.items.map((item, i) => ({
  title: item.name,
  problem: item.problem,
  quote: item.quote,
  action: item.action,
  emoji: personaEmojis[i],
  accent: personaAccents[i],
}));

export function PersonaShowcase() {
  return (
    <section id="personas" className="relative pb-8 md:pb-16">
      <HorizontalScrollTrack
        items={personas}
        header={
          <>
            <SectionLabel>{copy.landing.personas.label}</SectionLabel>
            <h2 className="display-lg font-heading text-ghost-white">
              <span className="text-gradient">
                {copy.landing.personas.headingAccent}
              </span>{" "}
              in the wild
            </h2>
            <p className="mt-4 max-w-lg text-sm text-muted-light md:text-base">
              {copy.landing.personas.scrollHint}
            </p>
          </>
        }
        renderItem={(persona, i) => (
          <motion.div
            key={persona.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: EASE_SMOOTH }}
            className="w-[min(85vw,340px)] shrink-0 md:w-[360px]"
          >
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ duration: 0.4, ease: EASE_SMOOTH }}
              className="brave-card brave-card-interactive relative flex h-full min-h-[340px] flex-col overflow-hidden p-7 md:p-8"
              style={{
                boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px ${persona.accent.glow}`,
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${persona.accent.color}80, transparent)`,
                }}
              />

              <div className="mb-6 flex items-start justify-between">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl"
                  style={{
                    borderColor: `${persona.accent.color}30`,
                    backgroundColor: `${persona.accent.color}12`,
                  }}
                >
                  {persona.emoji}
                </div>
                <span className="font-mono text-xs text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-ghost-white md:text-2xl">
                {persona.title}
              </h3>

              <span
                className="mt-3 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: `${persona.accent.color}35`,
                  color: persona.accent.color,
                  backgroundColor: `${persona.accent.color}10`,
                }}
              >
                {persona.problem}
              </span>

              {/* The verbatim line is the point of the card — generic
                  problem labels are exactly what Ghost exists to replace. */}
              <figure className="mt-5 flex-1">
                <blockquote
                  className="border-l-2 pl-4 text-sm leading-relaxed text-ghost-white/90"
                  style={{ borderColor: `${persona.accent.color}50` }}
                >
                  {persona.quote}
                </blockquote>
                <figcaption className="mt-3 pl-4 text-xs text-muted">
                  {copy.landing.personas.quoteLabel}
                </figcaption>
              </figure>

              <p className="mt-5 text-xs leading-relaxed text-muted">
                {persona.action}
              </p>

              <div className="mt-6 flex items-center gap-2 border-t border-border/50 pt-5">
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: persona.accent.color }}
                />
                <span className="text-xs font-medium text-muted">
                  {copy.landing.personas.activeBadge}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      />
    </section>
  );
}
