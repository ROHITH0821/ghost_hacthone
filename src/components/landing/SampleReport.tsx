"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

// Fictional services page — nine treatments, three priced.
const TREATMENTS: Array<[string, string | null]> = [
  ["Haircut & blow-dry", "₹900"],
  ["Party makeup", "₹2,800"],
  ["Gel manicure", "₹1,200"],
  ["Hydrating facial", null],
  ["Keratin treatment", null],
  ["Global hair colour", null],
  ["Saree draping", null],
  ["Pre-bridal care", null],
];

export function SampleReport() {
  const mock = useRef<HTMLDivElement>(null);
  const seen = useInView(mock, { once: true, amount: 0.45 });
  const [view, setView] = useState<"before" | "after">("before");

  return (
    <section id="sample" className="section-pad product-section relative border-y border-line bg-mist">
      <div className="product-container">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <Reveal><Eyebrow>Inside a Ghost report</Eyebrow></Reveal>
            <MaskLines className="display-lg font-heading text-ink" lines={["More useful than", <>a score <Serif>alone.</Serif></>]} />
          </div>
          <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
            <p className="text-[17px] leading-relaxed text-graphite">Each finding connects a specific page to a customer question and an action you can take.</p>
            <p className="mt-4 flex gap-2.5 text-[13px] leading-relaxed text-ash-text"><span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ash" />This example uses a fictional business. AI shopper feedback is a simulation, not a real customer testimonial or a measured conversion rate.</p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          {/* Evidence: the page as Ghost saw it. */}
          <Reveal className="lg:col-span-7">
            <div ref={mock} aria-hidden className="relative overflow-hidden rounded-[18px] border border-line bg-paper shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className="flex gap-1.5">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-line" />)}</span>
                <span className="mono-label mx-auto rounded-full bg-mist px-3 py-1 text-[10px] text-ash-text">bridalstudio.example/services</span>
                <span className="mono-label hidden text-[10px] text-ash-text sm:inline">Evidence 1/1</span>
              </div>
              <div className="relative px-5 pb-8 pt-6 sm:px-9">
                <p className="mono-label text-ash-text">Services page · Pricing</p>
                <p className="mt-2 font-heading text-2xl font-medium tracking-[-0.03em]">Services</p>
                <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                  {TREATMENTS.map(([name, price]) => (
                    <li key={name} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-2.5 text-[14px]">
                      <span className="text-graphite">{name}</span>
                      <span className={cn("tabular", price ? "text-ink" : "text-ash")}>{price ?? "—"}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-5 flex flex-wrap items-baseline justify-between gap-3 rounded-[12px] border border-line bg-mist/70 px-4 py-4 sm:px-5">
                  <span className="font-heading text-[17px] font-medium tracking-[-0.02em]">Bridal package</span>
                  <span className="relative text-[15px]">
                    <span className="marker text-ink" data-on={seen}>Contact for details</span>
                    {/* Red-pen circle */}
                    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-4 -inset-y-3 h-[calc(100%+24px)] w-[calc(100%+32px)] overflow-visible">
                      <motion.path
                        d="M104 6C58 3 12 12 8 30c-4 19 44 26 98 25 52-1 92-9 88-28C190 9 140 4 86 8"
                        fill="none"
                        stroke="var(--color-ember)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={seen ? { pathLength: 1, opacity: 1 } : undefined}
                        transition={{ pathLength: { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.7 }, opacity: { duration: 0.01, delay: 0.7 } }}
                      />
                    </svg>
                  </span>
                  <span className="mt-1 w-full rounded-full bg-ink py-2.5 text-center text-[13px] font-medium text-paper sm:mt-0 sm:w-auto sm:px-5">Enquire now</span>
                </div>
                {/* Annotation */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={seen ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.6, ease: EASE, delay: 1.5 }}
                  className="mt-5 flex items-start gap-3 sm:pl-[42%]"
                >
                  <svg viewBox="0 0 60 40" className="h-9 w-14 shrink-0 -scale-x-100 text-ember" fill="none">
                    <path d="M4 36C14 30 30 18 50 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M40 5.5 50.5 5l-2.8 9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="mono-label rounded-[8px] border border-ember/25 bg-ember-soft px-2.5 py-1.5 text-[10px] leading-relaxed text-ember-text">Price unanswered · 6 of 9 unpriced</span>
                </motion.div>
              </div>
            </div>
          </Reveal>

          {/* The finding. */}
          <Reveal delay={0.1} className="lg:col-span-5">
            <article className="flex h-full flex-col rounded-[18px] border border-line bg-paper p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="mono-label inline-flex items-center gap-2 rounded-full bg-ember-soft px-3 py-1.5 text-[10px] text-ember-text"><span aria-hidden className="ember-dot !h-1.5 !w-1.5" />High priority</span>
                <span className="mono-label text-[10px] text-ash-text">Example · Services page</span>
              </div>
              <h3 className="mt-6 font-heading text-[26px] font-medium leading-[1.15] tracking-[-0.03em]">The bridal package leaves the price unanswered.</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-graphite">Nine treatments are listed, but only three have a price. The bridal package says “Contact for details.” A price-conscious visitor cannot judge whether it fits their budget.</p>
              <blockquote className="my-8">
                <p className="serif-accent text-[clamp(24px,2.4vw,30px)] leading-[1.2] text-ink">“I found the bridal package, but I still don’t know what I should budget before contacting you.”</p>
                <footer className="mt-4 flex items-center gap-2.5">
                  <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-line bg-spectral text-[10px]">B</span>
                  <span className="mono-label text-[10px] text-ash-text">Simulated perspective · Budget buyer</span>
                </footer>
              </blockquote>
              <div className="mt-auto rounded-[14px] border border-line bg-mist p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-label text-ash-text">Recommended next step</p>
                  <div role="group" aria-label="Preview the change" className="flex rounded-full border border-line bg-paper p-0.5">
                    {(["before", "after"] as const).map((k) => (
                      <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn("mono-label min-h-8 rounded-full px-3 text-[10px] transition-colors", view === k ? "bg-ink text-paper" : "text-ash-text hover:text-ink")}>
                        {k === "before" ? "Before" : "After"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-graphite">Add a starting price and confirmed inclusions beside the enquiry button. Keep custom quotes available for requests that need them.</p>
                <div aria-hidden className="mt-4 flex min-h-[52px] items-center justify-between gap-3 rounded-[10px] border border-line bg-paper px-4 py-3 text-[13px]">
                  <span className="font-medium">Bridal package</span>
                  <motion.span key={view} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className={cn("flex items-center gap-2 text-right", view === "after" ? "text-ink" : "text-ash-text")}>
                    {view === "after" ? <><span className="h-1.5 w-1.5 rounded-full bg-resolved" />From ₹[starting price] · [inclusions]</> : <><span className="h-1.5 w-1.5 rounded-full bg-ember" />Contact for details</>}
                  </motion.span>
                </div>
              </div>
              <a href="#shoppers" className="group mt-6 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-line bg-paper px-5 text-sm font-medium text-ink transition-colors hover:border-[#C9CAC4] hover:bg-mist">See shopper simulations <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" /></a>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
