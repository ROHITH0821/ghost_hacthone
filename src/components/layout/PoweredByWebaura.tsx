"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";

export function PoweredByWebaura() {
  const { label, brand, url } = copy.footer.poweredBy;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: EASE_SMOOTH }}
      className="relative mt-14 overflow-hidden md:mt-16"
    >
      {/* Animated top line */}
      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-border" />
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-violet/70 to-transparent"
          animate={{ x: ["-50%", "350%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} ${brand}`}
        className="group relative flex items-center justify-center gap-3 py-7 md:gap-4 md:py-8"
      >
        {/* Hover wash */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-violet/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted/70 transition-colors group-hover:text-muted">
          {label}
        </span>

        <motion.div
          className="relative flex h-7 w-7 items-center justify-center md:h-8 md:w-8"
          whileHover={{ scale: 1.12 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-violet/0 blur-md transition-colors duration-500 group-hover:bg-violet/25"
          />
          <Image
            src="/webaura-logo.png"
            alt={brand}
            width={389}
            height={386}
            className="relative h-full w-full object-contain opacity-70 transition-all duration-500 group-hover:opacity-100"
          />
        </motion.div>

        <span className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-ghost-white/80 transition-colors group-hover:text-ghost-white md:text-base">
          {brand}
        </span>

        <motion.span
          className="text-xs text-violet-glow/0 transition-all duration-300 group-hover:text-violet-glow/80"
          initial={false}
        >
          ↗
        </motion.span>
      </motion.a>
    </motion.div>
  );
}
