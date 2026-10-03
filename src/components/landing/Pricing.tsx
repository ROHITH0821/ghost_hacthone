"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GhostMark } from "@/components/ui/GhostMark";
import { copy } from "@/lib/copy";
import { useStartScan } from "@/hooks/useStartScan";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";

function Tick({ inverted }: { inverted?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 shrink-0" fill="none">
      <circle cx="8" cy="8" r="7.25" stroke={inverted ? "rgba(255,255,255,0.28)" : "var(--color-line)"} strokeWidth="1" />
      <path d="m5 8.2 2 2 4-4.4" stroke={inverted ? "#FF8A3D" : "var(--color-ink)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  const start=useStartScan();
  return (
    <section id="pricing" className="section-pad product-section">
      <div className="product-container">
        <Reveal>
          <div className="mb-14 flex flex-col gap-3 rounded-[14px] border border-[#DDE2F7] bg-spectral px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper"><GhostMark className="h-4 w-4" /></span>
              <span className="mono-label text-ink">Early access</span>
            </span>
            <p className="text-[14px] leading-relaxed text-graphite">Ghost is in early access. Approved accounts can run Full Intelligence audits while payments are offline. The plans below describe the planned paid offering.</p>
          </div>
        </Reveal>
        <Reveal><Eyebrow>Audit options</Eyebrow></Reveal>
        <MaskLines className="display-lg max-w-[16ch] font-heading text-ink" lines={["The right depth", <>for your next <Serif>decision.</Serif></>]} />

        <div className="-mx-[clamp(1rem,5vw,4rem)] mt-12 flex snap-x snap-mandatory scroll-px-[clamp(1rem,5vw,4rem)] gap-4 overflow-x-auto px-[clamp(1rem,5vw,4rem)] pb-4 pt-6 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:items-stretch lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {copy.landing.pricing.tiers.map((tier, i) => {
            const hero = tier.highlighted;
            const free = tier.id === 'free';
            return (
              <Reveal key={tier.id} delay={i * 0.06} className="w-[82%] max-w-[340px] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:max-w-none">
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-[18px] border p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1",
                    hero
                      ? "border-ink bg-ink text-paper shadow-[0_30px_60px_-30px_rgba(10,10,12,0.55)] lg:-my-5 lg:py-11"
                      : free
                        ? "border-line bg-transparent hover:border-[#C9CAC4]"
                        : "border-line bg-paper hover:border-[#C9CAC4] hover:shadow-[var(--shadow-soft)]",
                  )}
                >
                  {hero && <span aria-hidden className="heat-gradient absolute inset-x-0 top-0 h-[3px] rounded-t-[18px]" />}
                  <div className="flex items-center justify-between gap-3">
                    {hero
                      ? <span className="mono-label inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-2.5 py-1 text-[10px] text-paper"><span aria-hidden className="ember-dot !h-1.5 !w-1.5" />Most complete</span>
                      : <p className="mono-label text-[10px] text-ash-text">{tier.id==='agency_2999'?'For client work':free?'A first look':'For one website'}</p>}
                  </div>
                  <h3 className="mt-5 font-heading text-[22px] font-medium tracking-[-0.03em]">{tier.name}</h3>
                  <p className="mt-5 flex items-baseline gap-2">
                    <span className="tabular font-heading text-[44px] font-medium leading-none tracking-[-0.05em]">{tier.price}</span>
                    <span className={cn("text-[13px]", hero ? "text-[#B6B8BE]" : "text-ash-text")}>{tier.cadence}</span>
                  </p>
                  <p className={cn("mt-4 text-[14px] leading-relaxed", hero ? "text-[#D4D5D9]" : "text-graphite")}>{tier.description}</p>
                  <ul className={cn("my-7 flex-1 space-y-3 border-t pt-6", hero ? "border-paper/15" : "border-line")}>
                    {tier.features.map(f => <li key={f} className={cn("flex items-start gap-2.5 text-[13px] leading-relaxed", hero ? "text-[#E4E5E8]" : "text-graphite")}><Tick inverted={hero} />{f}</li>)}
                  </ul>
                  <Button onClick={start} variant={hero?'primary':'secondary'} className={cn("w-full", hero && "!border-paper !bg-paper !text-ink hover:!bg-[#EDEDEA]", free && "!bg-transparent hover:!bg-paper")}>Request access <ArrowRight aria-hidden className="h-4 w-4" /></Button>
                </article>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-8 flex items-center gap-2.5 text-[13px] text-ash-text"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ash" />Planned prices in INR, exclusive of GST. No payment is collected during early access.</p>
      </div>
    </section>
  );
}
