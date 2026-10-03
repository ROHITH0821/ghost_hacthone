"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { handoffText, type HandoffSnapshot } from "@/lib/fixes/handoff";

export function SharedFixView({ snapshot, expiresAt }: { snapshot: HandoffSnapshot; expiresAt: string }) {
  const [checked, setChecked] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(handoffText(snapshot)); setMessage("Handoff copied."); }
    catch { setMessage("Copy is unavailable. Select the handoff text and copy it manually."); }
  }
  return <article className="mx-auto max-w-3xl">
    <header className="border-b border-border pb-8">
      <p className="eyebrow mb-4">Developer handoff · {snapshot.domain}</p>
      <h1 className="font-heading text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{snapshot.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-light">One issue, a suggested change and the checks to review before handing it back. Confirm the finding on the live page before implementing.</p>
      <button type="button" onClick={() => void copy()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium"><Copy aria-hidden className="h-4 w-4 text-violet" />Copy handoff</button>
      {message && <p role="status" className="mt-2 text-sm text-muted-light">{message}</p>}
    </header>
    <section className="mt-8" aria-labelledby="affected-page"><h2 id="affected-page" className="eyebrow">Affected page</h2><a href={snapshot.pageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-start gap-2 text-sm text-violet"><span className="break-all">{snapshot.pageUrl}</span><ExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /></a></section>
    <section className="mt-8" aria-labelledby="shared-issue"><h2 id="shared-issue" className="font-heading text-xl font-medium">Issue to address</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-light">{snapshot.issue}</p></section>
    <section className="mt-8" aria-labelledby="shared-change"><h2 id="shared-change" className="font-heading text-xl font-medium">Suggested change</h2><pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-border bg-surface p-5 font-body text-sm leading-relaxed">{snapshot.suggestedChange}</pre></section>
    <section className="mt-8" aria-labelledby="shared-checklist">
      <div className="flex items-center justify-between gap-3"><h2 id="shared-checklist" className="font-heading text-xl font-medium">Acceptance checklist</h2><span className="text-xs text-muted" aria-live="polite">{checked.length} / {snapshot.acceptanceCriteria.length} checked</span></div>
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
        {snapshot.acceptanceCriteria.map((item, index) => <li key={index}><label className="flex cursor-pointer items-start gap-3 p-4"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-violet" checked={checked.includes(index)} onChange={event => setChecked(current => event.target.checked ? [...current, index] : current.filter(value => value !== index))} /><span className={`text-sm leading-relaxed ${checked.includes(index) ? "text-muted line-through" : "text-muted-light"}`}>{item}</span></label></li>)}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">Checks are for your review in this tab. They do not update the owner’s fix status. Send the owner your implementation evidence when ready.</p>
    </section>
    <footer className="mt-10 flex items-start gap-2 border-t border-border pt-5 text-xs leading-relaxed text-muted"><Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>This link shares only this handoff. Available until {new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}, unless revoked by the owner.</p></footer>
  </article>;
}
