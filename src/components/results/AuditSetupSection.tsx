"use client";

import type { AuditConfigSnapshot, ConfigField } from "@/lib/audit-config/types";
import { AUDIT_TYPE_LABELS, auditDepthKind, type AuditType } from "@/lib/plans";
import { copy } from "@/lib/copy";

function SourceBadge({ source }: { source: ConfigField<string>["source"] }) {
  const label = copy.dashboardAuditSetup.sources[source];
  const cls =
    source === "user"
      ? "border-violet/40 bg-violet/10 text-violet"
      : source === "inherited"
        ? "border-ai-blue/30 bg-ai-blue/10 text-ai-blue"
        : "border-border bg-midnight/60 text-muted-light";

  return (
    <span className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase ${cls}`}>
      {label}
    </span>
  );
}

function FieldRow({ label, field }: { label: string; field?: { value: string; source: ConfigField<string>["source"] } }) {
  if (!field) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm text-ghost-white/90">{field.value}</span>
      <SourceBadge source={field.source} />
    </div>
  );
}

export function AuditSetupSection({ snapshot }: { snapshot: AuditConfigSnapshot }) {
  const auditLabel =
    AUDIT_TYPE_LABELS[(snapshot.auditType as AuditType) ?? "quick"] ?? snapshot.auditType;
  const depth = copy.auditDepth[
    auditDepthKind({ auditType: snapshot.auditType as AuditType })
  ];

  return (
    <section className="mt-8 rounded-2xl border border-border/60 bg-surface/30 p-5">
      <h3 className="font-heading text-lg font-semibold text-ghost-white">
        {copy.dashboardAuditSetup.title}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {copy.dashboardAuditSetup.auditType}
          </p>
          <p className="mt-1 text-sm text-ghost-white">{auditLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {copy.dashboardAuditSetup.limits}
          </p>
          <p className="mt-1 text-sm text-ghost-white">{depth.title}</p>
          <p className="mt-1 text-xs text-muted-light">{depth.body}</p>
        </div>
        {snapshot.clientName && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              {copy.dashboardAuditSetup.client}
            </p>
            <p className="mt-1 text-sm text-ghost-white">{snapshot.clientName}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        <FieldRow label="Business" field={snapshot.businessName} />
        <FieldRow label="Primary goal" field={snapshot.primaryGoal} />
        <FieldRow label="Audience" field={snapshot.targetAudience} />
        <FieldRow label="Important page" field={snapshot.importantPage} />
        <FieldRow label="Competitor hints" field={snapshot.competitorHints} />
      </div>
    </section>
  );
}
