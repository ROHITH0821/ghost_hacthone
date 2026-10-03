"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

// Purely visual: fictional agencies showing what white-label looks like.
const AGENCIES = [
  { name: "Northwind Studio", mark: "N", accent: "#1F6F5C", soft: "#E3F1EC" },
  { name: "Parallel & Co.", mark: "P", accent: "#4B3FC9", soft: "#EBE9FB" },
  { name: "Atlas Digital", mark: "A", accent: "#B4321F", soft: "#FBE7E3" },
];

const POINTS = [
  ['Organize by client','Keep each client’s sites, audits, and recommended fixes together.'],
  ['Make the report yours','Add your agency logo, accent color, and contact details to PDF reports.'],
  ['Show the work that follows','Track recommendations from planned to implemented, then verify with an eligible re-scan.'],
] as const;

const ICONS = [
  <svg key="a" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-5 w-5"><rect x="2.5" y="3.5" width="6" height="6" rx="1.5" /><rect x="11.5" y="3.5" width="6" height="6" rx="1.5" /><rect x="2.5" y="11.5" width="6" height="5" rx="1.5" /><rect x="11.5" y="11.5" width="6" height="5" rx="1.5" /></svg>,
  <svg key="b" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-5 w-5"><path d="M5 2.5h7l3.5 3.5v11.5H5Z" /><path d="M12 2.5V6h3.5" /><circle cx="8.5" cy="9.5" r="1.6" fill="#FF4A1C" stroke="none" /><path d="M7.5 13.5h5" /></svg>,
  <svg key="c" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="h-5 w-5"><path d="M3 15.5 7.5 10l3 3 6.5-8" /><path d="M13 5h4v4" /></svg>,
];

export function AgencySection() {
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { amount: 0.3 });
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % AGENCIES.length), 3200);
    return () => window.clearInterval(t);
  }, [inView, reduced]);
  const a = AGENCIES[i];

  return (
    <section id="agencies" className="section-pad product-section relative overflow-hidden bg-ink text-paper">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full opacity-[0.10]" style={{ background: "var(--heat-radial)" }} />
      <div className="product-container relative grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-6">
          <Reveal><Eyebrow className="!text-[#B6B8BE] [&>span]:!bg-paper/40">For agencies & freelancers</Eyebrow></Reveal>
          <MaskLines className="display-lg font-heading text-paper" lines={["A clearer conversation", <>with every <Serif>client.</Serif></>]} />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[#B6B8BE]">Give clients a practical review of their website, then keep the improvements moving in one workspace.</p>
            <a href="https://wa.me/918019013032" target="_blank" rel="noopener noreferrer" className="group mt-9 inline-flex min-h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-[#EDEDEA] active:scale-[0.98]">Discuss agency access <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
          </Reveal>
        </div>

        {/* White-label report mock, cycling agency brands. */}
        <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
          <div ref={wrap} aria-hidden className="relative mx-auto max-w-[440px]">
            <div className="absolute -bottom-3 left-6 right-6 top-6 rotate-[3deg] rounded-[14px] bg-paper/10" />
            <div className="relative overflow-hidden rounded-[14px] bg-paper p-6 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
              <AnimatePresence mode="wait">
                <motion.div key={a.name} initial={{ opacity: 0, y: 6, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(4px)" }} transition={{ duration: 0.45, ease: EASE }}>
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-[8px] font-heading text-sm font-semibold text-paper" style={{ background: a.accent }}>{a.mark}</span>
                      <span className="font-heading text-[15px] font-semibold tracking-[-0.02em]">{a.name}</span>
                    </span>
                    <span className="mono-label text-[9px] text-ash-text">Website review · PDF</span>
                  </div>
                  <p className="mono-label mt-5 text-[9px] text-ash-text">Prepared for</p>
                  <p className="mt-1 font-heading text-[19px] font-medium tracking-[-0.02em]">bridalstudio.example</p>
                  <div className="mt-5 flex items-center gap-4">
                    <div className="relative grid h-16 w-16 place-items-center">
                      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90"><circle cx="32" cy="32" r="28" fill="none" stroke="#EEEFEB" strokeWidth="5" /><circle cx="32" cy="32" r="28" fill="none" stroke={a.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${0.62 * 176} 176`} /></svg>
                      <span className="font-heading text-xl font-medium tabular">62</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <span className="block h-2 w-[80%] rounded-full bg-fog" />
                      <span className="block h-2 w-[60%] rounded-full bg-fog" />
                      <span className="block h-2 w-[70%] rounded-full" style={{ background: a.soft }} />
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {["Pricing clarity", "Trust near CTA", "Booking path"].map((row, r) => (
                      <div key={row} className="flex items-center justify-between rounded-[8px] border border-line px-3 py-2.5 text-[12px]">
                        <span>{row}</span>
                        <span className="h-1.5 w-10 rounded-full" style={{ background: r === 0 ? a.accent : a.soft }} />
                      </div>
                    ))}
                  </div>
                  <p className="mono-label mt-5 border-t border-line pt-3 text-[9px] text-ash-text">hello@{a.name.toLowerCase().replace(/[^a-z]/g, "")}.example</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-6 flex justify-center gap-0.5">
              {AGENCIES.map((x, k) => <span key={x.name} className="h-1 w-6 rounded-full bg-paper transition-[transform,opacity] duration-500" style={{ transform: `scaleX(${k === i ? 1 : 0.34})`, opacity: k === i ? 0.9 : 0.25 }} />)}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="product-container relative mt-20 grid border-t border-paper/15 md:grid-cols-3">
        {POINTS.map(([title, body], k) => (
          <Reveal key={title} delay={k * 0.06} className="border-paper/15 py-8 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l max-md:[&:not(:first-child)]:border-t">
            <span className="text-paper/80">{ICONS[k]}</span>
            <h3 className="mt-5 font-heading text-[19px] font-medium tracking-[-0.02em]">{title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#B6B8BE]">{body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
