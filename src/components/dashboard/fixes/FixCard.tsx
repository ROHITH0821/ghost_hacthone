"use client";

import { memo, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { FixStatusRow, FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { FIX_WORKFLOW_STATUSES } from "@/lib/db/fix-workflow";
import { copy } from "@/lib/copy";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import { ShareFixButton } from "@/components/fixes/ShareFixButton";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-danger/40 bg-danger/10 text-danger",
  high: "border-warning/30 bg-warning/10 text-warning",
  medium: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
  low: "border-border bg-midnight/70 text-muted-light",
};

function FixCardImpl({
  fix,
  canVerifyRescan,
  siteDomain,
  onStatusChange,
  selected = false,
  onToggleSelect,
}: {
  fix: FixStatusRow;
  canVerifyRescan: boolean;
  siteDomain?: string;
  onStatusChange: (id: string, status: FixWorkflowStatus) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const statusId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [copying, setCopying] = useState(false);
  const { openNewAudit } = useNewAudit();
  // Resolved-on-demand full text, kept so a second copy costs nothing.
  const fullContentRef = useRef<string | null>(null);
  const severityCls = fix.severity
    ? SEVERITY_STYLES[fix.severity] ?? SEVERITY_STYLES.low
    : SEVERITY_STYLES.low;

  const handleCopy = async () => {
    if (!fix.fixContent) return;

    setCopyError("");
    setCopying(true);
    try {
      let content = fullContentRef.current ?? fix.fixContent;
      if (fix.fixContentTruncated && fullContentRef.current == null) {
        const res = await fetch(`/api/dashboard/fixes/${fix.id}/content`);
        if (!res.ok) throw new Error("Could not load the complete fix. Try again or open the source report.");
        const data = await res.json();
        if (typeof data.fixContent !== "string" || !data.fixContent.trim()) throw new Error("The complete fix is unavailable. Open the source report.");
        fullContentRef.current = data.fixContent;
        content = data.fixContent;
      }
      if (!navigator.clipboard) throw new Error("Clipboard unavailable. Open the source report to select and copy the fix.");
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Could not copy the fix. Open the source report and try again.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <article className="rounded-xl border border-border/60 bg-midnight/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(fix.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-violet"
              aria-label={`Select ${fix.title}`}
            />
          )}
          <div>
          {fix.severity && (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${severityCls}`}
            >
              {copy.dashboardFixes.severity[fix.severity as keyof typeof copy.dashboardFixes.severity] ??
                fix.severity}
            </span>
          )}
          <h4 className="mt-2 text-sm font-medium text-ghost-white">{fix.title}</h4>
          {fix.siteDomain && (
            <p className="mt-1 text-xs text-muted">{fix.siteDomain}</p>
          )}
          </div>
        </div>
      </div>

      {fix.shopperQuote && (
        <p className="mt-3 text-xs italic text-muted-light line-clamp-3">
          &ldquo;{fix.shopperQuote}&rdquo;
        </p>
      )}

      {fix.fixContent && (
        <div className="mt-3 rounded-lg bg-midnight p-3">
          <pre className="max-h-24 overflow-hidden whitespace-pre-wrap text-xs text-muted-light line-clamp-4">
            {fix.fixContent}
          </pre>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <ShareFixButton fixId={fix.id} />
        {fix.fixContent && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-light hover:text-ghost-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-neon-green" /> : <Copy className="h-3.5 w-3.5" />}
            {copying ? "Loading…" : copied ? "Copied" : copy.dashboardFixes.actions.copy}
          </button>
        )}
        <Link
          href={`/results/${fix.missionId}#fixes`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-light hover:text-ghost-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {copy.dashboardFixes.actions.viewReport}
        </Link>
      </div>

      {copyError && <p role="alert" className="mt-3 text-xs text-danger">{copyError}</p>}

      <div className="mt-3 border-t border-border/40 pt-3">
        <label htmlFor={statusId} className="text-[10px] uppercase tracking-wider text-muted">
          {copy.dashboardFixes.actions.updateStatus}
        </label>
        <select
          id={statusId}
          value={fix.status}
          onChange={(e) => onStatusChange(fix.id, e.target.value as FixWorkflowStatus)}
          className="mt-1 w-full rounded-lg border border-border/60 bg-midnight/60 px-3 py-2 text-sm text-ghost-white outline-none"
        >
          {FIX_WORKFLOW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {copy.dashboardFixes.columns[s]}
            </option>
          ))}
        </select>
      </div>

      {canVerifyRescan && fix.status === "implemented" && siteDomain && (
        <button
          type="button"
          onClick={() =>
            openNewAudit({
              url: `https://${siteDomain}`,
              siteId: fix.siteId,
              preset: "rescan",
            })
          }
          className="mt-3 w-full rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-xs font-medium text-violet hover:bg-violet/15"
        >
          {copy.dashboardFixes.actions.verifyRescan}
        </button>
      )}
    </article>
  );
}

/**
 * Boards render hundreds of these; re-rendering them all on every selection
 * toggle or status change is the bulk of the interaction cost.
 */
export const FixCard = memo(FixCardImpl);
