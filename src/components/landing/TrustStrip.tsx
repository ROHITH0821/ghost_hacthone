"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH, VIEWPORT_DEFAULT } from "@/lib/motion";

export function TrustStrip() {
  const { stats, builtBy } = copy.landing.trust;
  const { url } = copy.footer.poweredBy;

  return (
    <section className="section-pad -mt-8 pb-16 md:pb-24">
      <div className="mx-auto max-w-[1400px]">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_DEFAULT}
          transition={{ duration: 0.7, ease: EASE_SMOOTH }}
          className="mx-auto mb-10 max-w-2xl text-center font-heading text-lg leading-snug text-ghost-white/90 md:text-xl"
        >
          {copy.landing.hero.vsAnalytics}
        </motion.p>

        <div className="brave-card grid gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_DEFAULT}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_SMOOTH }}
              className="bg-surface px-6 py-8 text-center"
            >
              <p className="font-heading text-3xl font-bold text-gradient-violet md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-snug text-muted">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-ghost-white"
          >
            <Image
              src="/webaura-logo.png"
              alt=""
              width={389}
              height={386}
              className="h-5 w-5 object-contain opacity-70 transition-opacity group-hover:opacity-100"
            />
            {builtBy}
            <span className="text-violet-glow/0 transition-colors group-hover:text-violet-glow/80">
              ↗
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
