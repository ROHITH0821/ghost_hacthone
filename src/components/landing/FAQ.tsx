"use client";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="faq" className="section-pad product-section border-t border-line">
      <div className="product-container grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <Reveal><Eyebrow>Before your first audit</Eyebrow></Reveal>
            <MaskLines className="display-lg font-heading text-ink" lines={["A few good", <><Serif>questions.</Serif></>]} />
          </div>
        </div>
        <div className="border-t border-line lg:col-span-7 lg:col-start-6">
          {copy.landing.faq.items.map((faq, i) => {
            const isOpen = open === i;
            const btn = `${base}-q${i}`;
            const panel = `${base}-a${i}`;
            return (
              <Reveal key={faq.q} delay={Math.min(i, 4) * 0.04} className="border-b border-line">
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex min-h-11 w-full items-start gap-5 py-6 text-left"
                  >
                    <span className="mono-label w-6 shrink-0 pt-[5px] text-ash-text">{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("flex-1 font-heading text-[clamp(17px,1.6vw,20px)] font-medium leading-snug tracking-[-0.02em] transition-colors", isOpen ? "text-ink" : "text-ink/85 group-hover:text-ink")}>{faq.q}</span>
                    <span aria-hidden className={cn("relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "rotate-45 border-ink bg-ink text-paper" : "border-line text-ink group-hover:border-ink")}>
                      <span className="absolute h-px w-3 bg-current" />
                      <span className="absolute h-3 w-px bg-current" />
                    </span>
                  </button>
                </h3>
                <motion.div
                  id={panel}
                  role="region"
                  aria-labelledby={btn}
                  inert={!isOpen}
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ height: { duration: 0.45, ease: EASE }, opacity: { duration: 0.3, ease: EASE } }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[60ch] pb-7 pl-11 text-[15px] leading-relaxed text-graphite">{faq.a}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
