"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

/** One finding, told in three beats: the page → the shopper → the fix. */
export function SampleReport() {
  const card = useRef<HTMLDivElement>(null);
  const seen = useInView(card, { once: true, amount: 0.4 });
  const beat = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: seen ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.7, ease: EASE, delay: 0.15 + i * 0.25 },
  });

  return (
    <section id="sample" className="section-pad product-section relative border-y border-line bg-mist">
      <div className="product-container">
        <div className="max-w-[640px]">
          <Reveal><Eyebrow>Inside a Ghost report</Eyebrow></Reveal>
          <MaskLines className="display-lg font-heading text-ink" lines={["More useful than", <>a score <Serif>alone.</Serif></>]} />
        </div>

        <div ref={card} className="mt-12 overflow-hidden rounded-[20px] border border-line bg-paper shadow-[var(--shadow-soft)] md:mt-16">
          <div className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {/* 01 · the page */}
            <motion.div {...beat(0)} className="relative p-7 md:p-9">
              <p className="mono-label text-ash-text">01 · The page</p>
              <div className="mt-8 rounded-[12px] border border-line bg-mist/70 px-4 py-4">
                <p className="mono-label text-[10px] text-ash-text">bridalstudio.example/services</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">Bridal package</span>
                  <span className="relative text-[14px] text-graphite">
                    Contact for details
                    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-3 -inset-y-2.5 h-[calc(100%+20px)] w-[calc(100%+24px)] overflow-visible">
                      <motion.path
                        d="M104 6C58 3 12 12 8 30c-4 19 44 26 98 25 52-1 92-9 88-28C190 9 140 4 86 8"
                        fill="none" stroke="var(--color-ember)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={seen ? { pathLength: 1, opacity: 1 } : undefined}
                        transition={{ pathLength: { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.6 }, opacity: { duration: 0.01, delay: 0.6 } }}
                      />
                    </svg>
                  </span>
                </div>
              </div>
              <p className="mt-6 text-[15px] leading-relaxed text-graphite">No price on the package people came for.</p>
              <span aria-hidden className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-ash lg:grid"><ArrowRight className="h-3.5 w-3.5" /></span>
            </motion.div>

            {/* 02 · the shopper */}
            <motion.div {...beat(1)} className="relative p-7 md:p-9">
              <div className="flex items-center justify-between gap-3">
                <p className="mono-label text-ash-text">02 · The shopper</p>
                <span className="mono-label inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-2.5 py-1 text-[10px] text-ember-text"><span aria-hidden className="ember-dot !h-1.5 !w-1.5" />High priority</span>
              </div>
              <blockquote className="mt-8">
                <p className="serif-accent text-[clamp(24px,2.2vw,30px)] leading-[1.18] text-ink">“I still don’t know what I should budget before contacting you.”</p>
                <footer className="mono-label mt-5 text-[10px] text-ash-text">Simulated · Budget buyer</footer>
              </blockquote>
              <span aria-hidden className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-ash lg:grid"><ArrowRight className="h-3.5 w-3.5" /></span>
            </motion.div>

            {/* 03 · the fix */}
            <motion.div {...beat(2)} className="p-7 md:p-9">
              <p className="mono-label text-ash-text">03 · The fix</p>
              <div className="mt-8 rounded-[12px] border border-resolved/25 bg-[#F3FAF6] px-4 py-4">
                <p className="mono-label text-[10px] text-resolved-text">Suggested copy</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">Bridal package</span>
                  <span className="flex items-center gap-2 text-[14px] text-ink">
                    From ₹[price]
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-resolved text-paper"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  </span>
                </div>
              </div>
              <p className="mt-6 text-[15px] leading-relaxed text-graphite">Show a starting price beside the enquiry button.</p>
            </motion.div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-ash-text">This example uses a fictional business. AI shopper feedback is a simulation, not a real customer testimonial or a measured conversion rate.</p>
          <a href="#shoppers" className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-5 text-sm font-medium text-ink transition-colors hover:border-[#C9CAC4] hover:bg-mist">See shopper simulations <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" /></a>
        </div>
      </div>
    </section>
  );
}
