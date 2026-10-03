"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const STEPS = [
  { title: 'Start with your site', body: 'Add your public website and the goal that matters: more enquiries, easier booking, or a clearer path to purchase.' },
  { title: 'See it through customer eyes', body: 'Ghost reads accessible pages and simulates relevant customer journeys, looking for unclear pricing, missing trust signals, and friction.' },
  { title: 'Turn findings into improvements', body: 'Review the evidence, use the suggested copy, and track your fixes. An eligible re-scan helps you compare changes.' },
];

export function ProgramSteps() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(2, Math.max(0, Math.floor(v * 3.0001)))));
  const pathClip = useTransform(scrollYProgress, [0.04, 0.9], ["inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  const ghostY = useTransform(scrollYProgress, [0.04, 0.9], ["0%", "100%"]);

  return (
    <section id="program" className="section-pad relative pt-[clamp(72px,10vw,144px)]">
      <div className="product-container grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Reveal><Eyebrow>From website to action</Eyebrow></Reveal>
          <MaskLines className="display-lg font-heading text-ink" lines={["Know what to fix.", <>And where to <Serif>start.</Serif></>]} />
        </div>
        <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
          <p className="max-w-[44ch] text-[17px] leading-relaxed text-graphite">Built for the person improving the website. Clear findings, concrete recommendations, and a way to track what changed.</p>
        </Reveal>
      </div>

      {/* Desktop: pinned, scroll-driven. Mobile: a simple vertical walk. */}
      <div ref={track} className="relative mt-16 lg:mt-8 lg:h-[300vh]">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
          <div className="product-container grid gap-10 lg:grid-cols-12 lg:gap-8">
            <ol className="relative lg:col-span-5">
              {/* The ghost path: a dotted trail that inks in as you scroll. */}
              <div aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px lg:left-[19px]">
                <div className="absolute inset-0 [background-image:radial-gradient(circle,var(--color-line)_1.2px,transparent_1.6px)] [background-size:2px_9px] bg-repeat-y" />
                <motion.div style={{ clipPath: pathClip }} className="absolute inset-0 hidden [background-image:radial-gradient(circle,var(--color-ink)_1.2px,transparent_1.6px)] [background-size:2px_9px] bg-repeat-y lg:block" />
                <div className="absolute inset-0 [background-image:radial-gradient(circle,var(--color-ink)_1.2px,transparent_1.6px)] [background-size:2px_9px] bg-repeat-y opacity-60 lg:hidden" />
                <motion.div style={{ top: ghostY }} className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper shadow-[var(--shadow-soft)]"><GhostMark className="h-4 w-4" track /></span>
                </motion.div>
              </div>
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative pb-12 pl-14 last:pb-0 lg:pb-14 lg:pl-16">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border bg-paper transition-colors duration-500 lg:h-10 lg:w-10",
                      active >= i ? "border-ink" : "border-line",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full transition-colors duration-500", active === i ? "bg-ember" : active > i ? "bg-ink" : "bg-line")} />
                  </span>
                  <div className={cn("transition-[opacity,filter] duration-500 lg:opacity-30", active === i && "lg:opacity-100")}>
                    <p className="mono-label text-ash-text">Step 0{i + 1}</p>
                    <h3 className="mt-2 flex items-baseline gap-4 font-heading text-[clamp(24px,2.6vw,32px)] font-medium leading-tight tracking-[-0.03em]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-graphite">{step.body}</p>
                  </div>
                  <div className="mt-6 lg:hidden"><Vignette index={i} on /></div>
                </li>
              ))}
            </ol>

            <div aria-hidden className="relative hidden lg:col-span-7 lg:block">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[18px] border border-line bg-mist">
                <span className="mono-label absolute left-5 top-4 z-10 text-ash-text">0{active + 1} / 03</span>
                <span className="font-heading pointer-events-none absolute -bottom-10 right-4 text-[220px] font-semibold leading-none tracking-[-0.06em] text-fog tabular">0{active + 1}</span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="absolute inset-0 grid place-items-center p-10"
                  >
                    <Vignette index={active} on large />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Vignette({ index, on, large = false }: { index: number; on: boolean; large?: boolean }) {
  if (index === 0) return <GoalVignette large={large} />;
  if (index === 1) return <PersonaVignette on={on} large={large} />;
  return <ChecklistVignette large={large} />;
}

/* 01 · URL + goal selector */
function GoalVignette({ large }: { large: boolean }) {
  const goals = ["More enquiries", "Easier booking", "Clearer path to purchase"];
  return (
    <div aria-hidden className={cn("w-full rounded-[14px] border border-line bg-paper p-4 shadow-[var(--shadow-soft)]", large ? "max-w-[460px] p-6" : "")}>
      <p className="mono-label text-ash-text">Website</p>
      <div className="mt-2 flex h-11 items-center gap-2 rounded-full bg-fog px-4 text-[15px]">
        <span className="h-2 w-2 rounded-full bg-resolved" />
        <motion.span initial={{ clipPath: "inset(0 100% 0 0)" }} whileInView={{ clipPath: "inset(0 0% 0 0)" }} viewport={{ once: true }} transition={{ duration: 0.9, ease: "linear", delay: 0.2 }} className="whitespace-nowrap">
          bridalstudio.example
        </motion.span>
        <span className="animate-cursor-blink h-4 w-px bg-ink" />
      </div>
      <p className="mono-label mt-5 text-ash-text">Goal</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {goals.map((g, i) => (
          <motion.span
            key={g}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.08 }}
            className={cn("rounded-full border px-3 py-1.5 text-[13px]", i === 0 ? "border-ink bg-ink text-paper" : "border-line text-graphite")}
          >
            {g}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* 02 · Personas walking a mini site, friction lighting up */
function PersonaVignette({ on, large }: { on: boolean; large: boolean }) {
  const personas = [
    { name: "Budget buyer", path: { x: ["8%", "40%", "40%", "62%"], y: ["20%", "30%", "62%", "62%"] }, delay: 0 },
    { name: "Comparer", path: { x: ["8%", "70%", "70%", "40%"], y: ["20%", "22%", "60%", "64%"] }, delay: 0.5 },
    { name: "Ready to book", path: { x: ["8%", "30%", "72%", "78%"], y: ["20%", "40%", "40%", "84%"] }, delay: 1 },
  ];
  const friction = [
    { x: "40%", y: "62%", at: 1.4 },
    { x: "70%", y: "22%", at: 2.0 },
    { x: "78%", y: "84%", at: 2.8 },
  ];
  return (
    <div aria-hidden className={cn("relative w-full overflow-hidden rounded-[14px] border border-line bg-paper shadow-[var(--shadow-soft)]", large ? "aspect-[16/10] max-w-[520px]" : "aspect-[16/11]")}>
      <div className="flex h-6 items-center gap-1 border-b border-line px-3">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full bg-line" />)}</div>
      <div className="absolute inset-x-[6%] top-[18%] h-[10%] rounded bg-fog" />
      <div className="absolute left-[6%] top-[34%] h-[18%] w-[44%] rounded bg-mist" />
      <div className="absolute right-[6%] top-[34%] h-[18%] w-[40%] rounded border border-line" />
      {[0, 1, 2].map((c) => <div key={c} className="absolute top-[56%] h-[20%] w-[27%] rounded border border-line" style={{ left: `${6 + c * 30}%` }} />)}
      <div className="absolute inset-x-[6%] bottom-[6%] h-[9%] rounded bg-fog" />
      {friction.map((f, i) => (
        <motion.span
          key={i}
          className="absolute -ml-6 -mt-6 h-12 w-12 rounded-full"
          style={{ left: f.x, top: f.y, background: "var(--heat-radial)" }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={on ? { opacity: [0, 0.9, 0.7], scale: [0.3, 1.1, 1] } : undefined}
          transition={{ duration: 0.8, ease: EASE, delay: f.at }}
        />
      ))}
      {friction.map((f, i) => (
        <motion.span key={`d${i}`} className="ember-dot absolute -ml-1 -mt-1" style={{ left: f.x, top: f.y }} initial={{ scale: 0 }} animate={on ? { scale: 1 } : undefined} transition={{ duration: 0.4, delay: f.at, ease: [0.34, 1.56, 0.64, 1] }} />
      ))}
      {personas.map((p) => (
        <motion.div
          key={p.name}
          className="pointer-events-none absolute inset-0"
          initial={{ x: p.path.x[0], y: p.path.y[0], opacity: 0 }}
          animate={on ? { x: p.path.x, y: p.path.y, opacity: [0, 1, 1, 1] } : undefined}
          transition={{ duration: 2.6, ease: "easeInOut", delay: p.delay }}
        >
          <span className="absolute -left-3 -top-3 flex items-center gap-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-ink/15 bg-spectral/90"><GhostMark className="h-3.5 w-3.5" /></span>
            <span className="mono-label whitespace-nowrap rounded-full bg-paper/90 px-1.5 py-0.5 text-[9px] text-graphite">{p.name}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* 03 · Findings checklist ticking to resolved */
function ChecklistVignette({ large }: { large: boolean }) {
  const items = ["Add a starting price to the bridal package", "Show reviews beside the booking button", "Link the dead-end button to enquiry"];
  return (
    <div aria-hidden className={cn("w-full rounded-[14px] border border-line bg-paper p-4 shadow-[var(--shadow-soft)]", large ? "max-w-[460px] p-6" : "")}>
      <div className="flex items-center justify-between">
        <p className="mono-label text-ash-text">Fix tracker</p>
        <p className="mono-label text-resolved-text">Re-scan ready</p>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {items.map((item, i) => (
          <li key={item} className="flex items-center gap-3 py-3">
            <motion.span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border"
              initial={{ backgroundColor: "#FFFFFF", borderColor: "#E6E6E1" }}
              whileInView={{ backgroundColor: "#12A15E", borderColor: "#12A15E" }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.45 }}
            >
              <motion.svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                <motion.path d="M2.5 6.2 5 8.5l4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.5 + i * 0.45 }} />
              </motion.svg>
            </motion.span>
            <span className="text-[14px] text-ink">{item}</span>
            <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 + i * 0.45 }} className="mono-label ml-auto shrink-0 text-[10px] text-resolved-text">Implemented</motion.span>
          </li>
        ))}
      </ul>
    </div>
  );
}
