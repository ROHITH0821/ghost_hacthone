"use client";

import { motion } from "framer-motion";
import {
  ScrollReveal,
  SectionHeading,
  SectionLabel,
} from "@/components/ui/BRAVE";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";

export function IntelligenceFinale() {
  return (
    <section className="section-pad py-24 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{copy.landing.finale.label}</SectionLabel>

        <SectionHeading size="lg" className="mb-6">
          Report <span className="text-gradient">finale</span>
        </SectionHeading>

        <ScrollReveal>
          <p className="mb-12 max-w-lg text-muted-light">
            {copy.landing.finale.subtitle}
          </p>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {copy.landing.finale.outcomes.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.12}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.4, ease: EASE_SMOOTH }}
                className="brave-card brave-card-interactive group h-full p-8 md:p-10"
              >
                <h3 className="font-heading text-2xl font-bold text-ghost-white transition-colors group-hover:text-violet-glow md:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-light md:text-base">
                  {item.description}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
