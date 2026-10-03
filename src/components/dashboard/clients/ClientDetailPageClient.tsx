"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientDetail } from "@/lib/db/clients";
import type { AuditMissionRow } from "@/lib/db/missions";
import type { FixStatusRow } from "@/lib/db/fix-workflow";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import { copy } from "@/lib/copy";
import { LocalTime } from "@/components/ui/LocalTime";

type Tab = "overview" | "audits" | "fixes";

export function ClientDetailPageClient({
  client,
  audits,
  fixes,
}: {
  client: ClientDetail;
  audits: AuditMissionRow[];
  fixes: FixStatusRow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const { openNewAudit } = useNewAudit();

  const tabs: Tab[] = ["overview", "audits", "fixes"];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/clients" className="text-sm text-muted hover:text-violet">
          ← Clients
        </Link>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-ghost-white">{client.name}</h2>
        <p className="mt-1 text-sm text-muted">{client.primaryDomain}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                tab === t
                  ? "border-violet/50 bg-violet/10 text-violet"
                  : "border-border/60 text-muted-light"
              }`}
            >
              {copy.dashboardClients.tabs[t]}
            </button>
          ))}
        </div>
      </header>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={copy.dashboardClients.latestScore}
              value={client.latestScore != null ? String(Math.round(client.latestScore)) : "—"}
            />
            <StatCard
              label={copy.dashboardClients.criticalSpots}
              value={String(client.criticalCount)}
            />
            <StatCard label={copy.dashboardClients.lastAudit} value={client.latestMissionStatus ?? "—"} />
          </div>
          <button
            type="button"
            onClick={() =>
              openNewAudit({
                url: `https://${client.primaryDomain}`,
                clientId: client.id,
              })
            }
            className="rounded-xl border border-violet/40 bg-violet/10 px-5 py-2.5 text-sm font-medium text-violet"
          >
            {copy.dashboardClients.newAudit}
          </button>
          {client.latestMissionId && (
            <Link
              href={`/results/${client.latestMissionId}`}
              className="ml-3 text-sm text-violet hover:underline"
            >
              View latest report
            </Link>
          )}
        </div>
      )}

      {tab === "audits" && (
        <ul className="space-y-2">
          {audits.length === 0 ? (
            <p className="text-sm text-muted">No audits yet for this client.</p>
          ) : (
            audits.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-midnight/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-ghost-white">{a.domain}</p>
                  <p className="text-xs text-muted">
                    {a.status} · <LocalTime date={a.createdAt} />
                  </p>
                </div>
                <Link href={`/mission/${a.id}`} className="text-sm text-violet hover:underline">
                  Open
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      {tab === "fixes" && (
        <ul className="space-y-2">
          {fixes.length === 0 ? (
            <p className="text-sm text-muted">No fixes yet for this client.</p>
          ) : (
            fixes.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-border/60 bg-midnight/40 px-4 py-3"
              >
                <p className="text-sm text-ghost-white">{f.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {f.status}
                  {f.severity ? ` · ${f.severity}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-ghost-white">{value}</p>
    </div>
  );
}
