"use client";

import { FeedbackState } from "@/components/ui/FeedbackState";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WebsiteIcon } from "@/components/ui/WebsiteIcon";
import { useRouter } from "next/navigation";
import type { ClientDashboardRow } from "@/lib/db/clients";
import { Button } from "@/components/ui/Button";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import { copy } from "@/lib/copy";
import { formatRescanExpiry, PLAN_IDS } from "@/lib/plans";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

export function ClientsPageClient() {
  const { openNewAudit } = useNewAudit();
  const { planSummary, isAgencyUser } = useDashboard();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAgencyUser) router.replace("/dashboard/plan");
  }, [isAgencyUser, router]);

  const { data, isPending, isError, error: loadError, refetch } = useDashboardQuery<{
    clients: ClientDashboardRow[];
  }>({
    queryKey: dashboardKeys.clients(),
    path: "/api/dashboard/clients/list",
    enabled: isAgencyUser,
  });

  const [clients, setClients] = useState<ClientDashboardRow[]>([]);

  useEffect(() => {
    if (data?.clients) setClients(data.clients);
  }, [data?.clients]);

  const quotaExhausted =
    planSummary.primaryPlanId === PLAN_IDS.agency2999 &&
    planSummary.auditsLimit != null &&
    planSummary.auditsUsedPeriod >= planSummary.auditsLimit;

  if (!isAgencyUser) return <DashboardPageLoading />;
  if (isPending && clients.length === 0) return <DashboardPageLoading />;
  if (isError) return <FeedbackState title="Couldn’t load clients" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, primaryDomain: domain, referenceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create client");
        return;
      }
      setClients((prev) => [data.client, ...prev]);
      setShowForm(false);
      setName("");
      setDomain("");
      setReferenceId("");
    } catch {
      setError("Could not create client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ghost-white">
            {copy.dashboardShell.pages.clients}
          </h2>
          <p className="mt-2 text-sm text-muted">{copy.dashboardClients.subtitle}</p>
        </div>
        <Button variant="glow" size="md" onClick={() => setShowForm(true)}>
          {copy.dashboardClients.addClient}
        </Button>
      </header>

      {quotaExhausted && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
          <p className="font-medium text-ghost-white">{copy.dashboardAgency.quotaExhaustedTitle}</p>
          <p className="mt-2 text-sm text-muted">
            {copy.dashboardAgency.quotaExhaustedBody}{" "}
            {planSummary.periodResetAt &&
              `Resets ${formatRescanExpiry(planSummary.periodResetAt)}.`}
          </p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-border/60 bg-midnight/40 p-5 space-y-4"
        >
          <label className="block">
            <span className="text-sm text-muted-light">{copy.dashboardClients.name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted-light">{copy.dashboardClients.domain}</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted-light">{copy.dashboardClients.referenceId}</span>
            <input
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="glow" size="md" isLoading={loading}>
              {copy.dashboardClients.addClient}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-midnight/40 p-8 text-center">
          <p className="font-medium text-ghost-white">{copy.dashboardClients.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted">{copy.dashboardClients.emptyBody}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article
              key={client.id}
              className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <WebsiteIcon src={client.faviconUrl} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-ghost-white">{client.name}</h3>
                  <p className="text-sm text-muted">{client.primaryDomain}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">{copy.dashboardClients.latestScore}</p>
                  <p className="font-medium text-ghost-white">
                    {client.latestScore != null ? Math.round(client.latestScore) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">{copy.dashboardClients.criticalSpots}</p>
                  <p className="font-medium text-ghost-white">{client.criticalCount}</p>
                </div>
              </div>
              {client.latestMissionStatus && (
                <p className="mt-3 text-xs uppercase tracking-wider text-muted">
                  {client.latestMissionStatus}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="rounded-xl border border-border px-3 py-2 text-sm text-ghost-white/80 hover:text-ghost-white"
                >
                  {copy.dashboardClients.viewClient}
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openNewAudit({
                      url: `https://${client.primaryDomain}`,
                      clientId: client.id,
                    })
                  }
                  disabled={quotaExhausted}
                  className="rounded-xl border border-violet/40 bg-violet/10 px-3 py-2 text-sm text-violet disabled:opacity-50"
                >
                  {copy.dashboardClients.newAudit}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
