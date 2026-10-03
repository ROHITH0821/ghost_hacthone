"use client";

import { useEffect, useId, useState } from "react";
import { Copy, ExternalLink, Share2, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { HandoffInputSchema, type HandoffEditorData } from "@/lib/fixes/handoff";

const fieldClass = "mt-2 w-full rounded-lg border border-border bg-midnight px-3 py-2 text-sm text-ghost-white";

export function ShareFixButton({ fixId }: { fixId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<HandoffEditorData | null>(null);
  const [criteria, setCriteria] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const path = `/api/dashboard/fixes/${encodeURIComponent(fixId)}/share`;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setMessage(""); setData(null);
    fetch(path, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load this handoff. Please try again.");
        const value: HandoffEditorData = await response.json();
        if (controller.signal.aborted) return;
        setData(value); setCriteria(value.draft.acceptanceCriteria.join("\n")); setDirty(false);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, path, reload]);

  function edit(field: "issue" | "pageUrl" | "suggestedChange", value: string) {
    setData(current => current ? { ...current, draft: { ...current.draft, [field]: value } } : null);
    setDirty(true); setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    const parsed = HandoffInputSchema.safeParse({ issue: data.draft.issue, pageUrl: data.draft.pageUrl,
      suggestedChange: data.draft.suggestedChange, acceptanceCriteria: criteria.split("\n").map(line => line.trim()).filter(Boolean) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the fields."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!response.ok) throw new Error("Could not save the share link. Please try again.");
      const value: HandoffEditorData = await response.json();
      setData(value); setCriteria(value.draft.acceptanceCriteria.join("\n")); setDirty(false);
      setMessage(data.share ? "Shared handoff updated." : "Your link is ready to copy and send.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not create the link."); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not revoke the link. Please try again.");
      setData(current => current ? { ...current, share: null } : null);
      setMessage("Link revoked. It can no longer be opened.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not revoke the link."); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    if (!data?.share) return;
    try {
      await navigator.clipboard.writeText(new URL(data.share.path, window.location.origin).href);
      setMessage("Link copied. Send it to your developer.");
    } catch { setMessage("Select the link below and copy it manually."); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-light hover:text-ghost-white">
      <Share2 aria-hidden className="h-3.5 w-3.5" />Share with developer
    </button>
    <Dialog open={open} onClose={() => setOpen(false)} labelledBy={`${id}-title`} busy={busy}>
      <div className="max-h-[88dvh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="eyebrow mb-2">Developer handoff</p><h2 id={`${id}-title`} className="font-heading text-xl font-medium">Share one clear next step.</h2></div>
          <button type="button" aria-label="Close handoff" disabled={busy} onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border"><X aria-hidden className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-light">Review the issue and checklist before sharing. Anyone with the link can read this handoff without signing in. It expires after 30 days and you can revoke it here.</p>
        {loading && <p role="status" className="mt-6 text-sm text-muted">Loading handoff…</p>}
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        {!loading && !data && error && <button type="button" onClick={() => setReload(value => value + 1)} className="mt-3 text-sm text-violet">Try again</button>}
        {data && <form onSubmit={save} className="mt-6 space-y-5">
          <div><p className="font-medium">{data.draft.title}</p><p className="mt-1 text-xs text-muted">{data.draft.domain} · Only the fields below are shared</p></div>
          <label className="block text-sm font-medium" htmlFor={`${id}-page`}>Affected page URL
            <input id={`${id}-page`} type="url" required maxLength={2048} value={data.draft.pageUrl} onChange={event => edit("pageUrl", event.target.value)} placeholder="https://yourwebsite.com/services" className={fieldClass} />
            <span className="mt-1 block text-xs font-normal text-muted">Confirm the exact page; Ghost does not guess URLs from page names.</span>
          </label>
          <label className="block text-sm font-medium" htmlFor={`${id}-issue`}>Issue to address
            <textarea id={`${id}-issue`} required maxLength={8000} rows={3} value={data.draft.issue} onChange={event => edit("issue", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium" htmlFor={`${id}-change`}>Suggested change
            <textarea id={`${id}-change`} required maxLength={32000} rows={5} value={data.draft.suggestedChange} onChange={event => edit("suggestedChange", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium" htmlFor={`${id}-checks`}>Acceptance checklist
            <textarea id={`${id}-checks`} required rows={6} value={criteria} onChange={event => { setCriteria(event.target.value); setDirty(true); setMessage(""); }} className={fieldClass} aria-describedby={`${id}-checks-help`} />
            <span id={`${id}-checks-help`} className="mt-1 block text-xs font-normal text-muted">One check per line, up to 12. Edit these suggested checks to match the work.</span>
          </label>
          {data.share && <div className="rounded-xl border border-violet/30 bg-violet/5 p-4">
            <label htmlFor={`${id}-link`} className="text-xs font-medium text-violet">Share link</label>
            <input id={`${id}-link`} readOnly value={typeof window !== "undefined" ? new URL(data.share.path, window.location.origin).href : data.share.path} onFocus={event => event.target.select()} className={`${fieldClass} text-xs`} />
            <p className="mt-2 text-xs text-muted">Expires {new Date(data.share.expiresAt).toLocaleDateString()}{dirty ? " · Save your changes to update the shared handoff." : ""}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <button type="button" onClick={() => void copyLink()} disabled={busy || dirty} className="inline-flex min-h-10 items-center gap-2 text-sm text-violet disabled:opacity-50"><Copy aria-hidden className="h-4 w-4" />Copy link</button>
              <a href={data.share.path} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-light">Preview <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>
              <button type="button" onClick={() => void revoke()} disabled={busy} className="min-h-10 text-sm text-danger disabled:opacity-50">Revoke link</button>
            </div>
          </div>}
          {message && <p role="status" className="text-sm text-violet">{message}</p>}
          <div className="flex justify-end border-t border-border pt-4"><button type="submit" disabled={busy || Boolean(data.share && !dirty)} className="min-h-11 rounded-lg bg-violet px-5 py-2 text-sm font-medium text-midnight disabled:opacity-50">{busy ? "Saving…" : data.share ? "Save changes" : "Create share link"}</button></div>
        </form>}
      </div>
    </Dialog>
  </>;
}
