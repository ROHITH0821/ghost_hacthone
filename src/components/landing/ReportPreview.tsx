"use client";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Check, FileText, Search, Wrench } from "lucide-react";

/** Fictional, interactive example; never presented as a live audit or testimonial. */
export function ReportPreview() {
  const [tab, setTab] = useState<'findings' | 'fix'>('findings');
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_80px_-40px_#000]">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 text-xs">
        <span className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-violet" /> Website review</span><span className="rounded border border-border px-2 py-0.5 text-muted">EXAMPLE</span>
      </div>
      <div className="p-5 md:p-6">
        <p className="text-xs text-muted">Bridal & beauty studio</p>
        <div className="mt-1 flex items-center justify-between gap-2"><p className="font-heading text-lg font-medium">bridalstudio.example</p><ArrowUpRight aria-hidden className="h-4 w-4 text-muted" /></div>
        <div className="my-6 flex items-center gap-5 border-y border-border/60 py-5">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-[5px] border-warning/25 border-t-warning border-r-warning"><span className="font-heading text-3xl font-medium tabular-nums">62</span></div>
          <div><p className="text-sm font-semibold">A good offer. A difficult decision.</p><p className="mt-1 text-xs leading-relaxed text-muted">Pricing and trust leave visitors<br />with unanswered questions.</p><p className="mt-2 text-[11px] text-warning">Ghost Score · Needs improvement</p></div>
        </div>
        <div className="mb-4 flex gap-1 rounded-lg bg-midnight p-1" role="group" aria-label="Example report view">
          <button type="button" aria-pressed={tab === 'findings'} onClick={() => setTab('findings')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${tab === 'findings' ? 'bg-surface-elevated text-ghost-white' : 'text-muted'}`}><Search className="h-3.5 w-3.5" /> Findings</button>
          <button type="button" aria-pressed={tab === 'fix'} onClick={() => setTab('fix')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${tab === 'fix' ? 'bg-surface-elevated text-ghost-white' : 'text-muted'}`}><Wrench className="h-3.5 w-3.5" /> Suggested fix</button>
        </div>
        <div className="min-h-[176px]" aria-live="polite">
          {tab === 'findings' ? <div className="divide-y divide-border/60">
            {[['01', 'Bridal package pricing is unclear', 'Services page · Pricing', 'High'], ['02', 'No reviews beside the booking CTA', 'Booking page · Trust', 'Medium']].map(([n,title,page,severity]) => <div key={n} className="flex items-start gap-3 py-4"><span className="pt-0.5 font-mono text-xs text-muted">{n}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted">{page}</p></div><span className={`mt-0.5 text-[11px] ${severity === 'High' ? 'text-danger' : 'text-warning'}`}>{severity}</span></div>)}
          </div> : <div className="rounded-lg border border-violet/25 bg-violet/5 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-violet"><Check className="h-4 w-4" /> Add a clear starting price</p><p className="mt-3 text-sm">Bridal makeup from ₹[starting price]. Includes [confirmed services]. Ask us about your date.</p><p className="mt-3 text-xs text-muted">Place under the bridal package. Fill in the brackets before publishing.</p></div>}
        </div>
        <p className="flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted"><ArrowDown className="h-3.5 w-3.5 text-violet" /> Evidence → recommended action → verification</p>
      </div>
    </div>
  );
}
