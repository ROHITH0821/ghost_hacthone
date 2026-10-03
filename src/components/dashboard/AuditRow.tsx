"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import type { RecentMissionRow } from "@/lib/db/missions";
import { AUDIT_TYPE_LABELS, type AuditType } from "@/lib/plans";
import { copy } from "@/lib/copy";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  running: { label: "Running", cls: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue" },
  complete: {
    label: "Complete",
    cls: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  },
  error: { label: "Failed", cls: "border-danger/30 bg-danger/10 text-danger" },
};

function domainLabel(input: string) {
  return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function AuditRow({
  mission,
  compact = false,
}: {
  mission: RecentMissionRow;
  compact?: boolean;
}) {
  const style = STATUS_STYLES[mission.status] ?? {
    label: mission.status,
    cls: "border-border bg-midnight/70 text-ghost-white/70",
  };

  const stage = mission.progress?.currentStage ?? "opening";
  const progress =
    typeof mission.progress?.stageProgress === "number" ? mission.progress.stageProgress : null;
  const auditLabel =
    AUDIT_TYPE_LABELS[(mission.auditType as AuditType) ?? "quick"] ?? mission.auditType;

  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-midnight/40 ${
        compact ? "p-3" : "p-4"
      } md:flex-row md:items-center`}
    >
      <div className="min-w-0 flex-1">
        <div className="audit-row flex flex-wrap items-center gap-2">
          <Pill className={style.cls}>{style.label}</Pill>
          <Pill className="border-border bg-surface/40 text-muted-light">{auditLabel}</Pill>
          <p className="truncate text-sm font-medium text-ghost-white/90">
            {domainLabel(mission.domain)}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-light">
          {mission.score != null && mission.status === "complete" && (
            <span className="font-medium text-ghost-white/80">
              Ghost Score {Math.round(mission.score)}
            </span>
          )}
          {mission.criticalCount != null && mission.criticalCount > 0 && (
            <span className="text-danger/80">{mission.criticalCount} critical</span>
          )}
          <span>
            <LocalTime date={mission.createdAt} />
          </span>
          {progress !== null && mission.status === "running" && (
            <span>
              {stage} · {progress}%
            </span>
          )}
          {mission.status === "error" && mission.progress?.error && (
            <span className="text-danger/80">{mission.progress.error}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {mission.status === "complete" && (
          <>
            <Link
              href={`/results/${mission.id}`}
              className="rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
            >
              {copy.dashboardOverview.actions.viewReport}
            </Link>
            <a
              href={`/api/reports/${mission.id}/pdf?download=1`}
              className="flex items-center gap-1.5 rounded-xl border border-violet/40 bg-violet/10 px-4 py-2 text-sm font-medium text-violet transition-colors hover:bg-violet/20"
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
          </>
        )}
        {mission.status === "running" && (
          <Link
            href={`/mission/${mission.id}`}
            className="rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
          >
            {copy.dashboardOverview.actions.continue}
          </Link>
        )}
        {mission.status === "error" && (
          <Link
            href={dashboardNewAuditHref(mission.url)}
            className="rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
          >
            {copy.dashboardOverview.actions.retry}
          </Link>
        )}
      </div>
    </div>
  );
}
