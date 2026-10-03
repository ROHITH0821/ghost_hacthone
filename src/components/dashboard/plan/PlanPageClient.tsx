"use client";

import { FeedbackState } from "@/components/ui/FeedbackState";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import type { OwnedPurchaseRow, PlanSummary } from "@/lib/db/entitlements";
import {
  PLAN_IDS,
  PRODUCT_METADATA,
  PRODUCT_PRICES_INR,
  formatRescanExpiry,
} from "@/lib/plans";
import { copy } from "@/lib/copy";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";
import { useQueryClient } from "@tanstack/react-query";

export function PlanPageClient() {
  const { planSummary: liveSummary, isAgencyUser } = useDashboard();
  const { openNewAudit } = useNewAudit();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const { data, isPending, isError, error: loadError, refetch } = useDashboardQuery<{
    planSummary: PlanSummary;
    purchases: OwnedPurchaseRow[];
  }>({
    queryKey: dashboardKeys.plan(),
    path: "/api/dashboard/plan",
  });

  const summary = liveSummary ?? data?.planSummary;
  const purchases = useMemo(() => data?.purchases ?? [], [data?.purchases]);

  const unboundCounts = useMemo(() => {
    const standard = purchases.filter(
      (p) => p.planId === PLAN_IDS.oneSite499 && !p.isBound
    ).length;
    const deep = purchases.filter(
      (p) => p.planId === PLAN_IDS.deep999 && !p.isBound
    ).length;
    return { standard, deep };
  }, [purchases]);

  if (isPending && !data) return <DashboardPageLoading />;
  if (isError || !summary) return <FeedbackState title="Couldn’t load plan" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;
  const agencyActive =
    isAgencyUser || summary.primaryPlanId === PLAN_IDS.agency2999;

  async function handleAgencySubscribe() {
    setAgencyLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/agency-subscribe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not activate Agency plan");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not activate Agency plan");
    } finally {
      setAgencyLoading(false);
    }
  }

  async function handlePurchase(planId: typeof PLAN_IDS.oneSite499 | typeof PLAN_IDS.deep999) {
    setLoading(planId);
    setError(null);
    setPurchaseSuccess(null);
    try {
      const res = await fetch("/api/dev/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Purchase failed");
        return;
      }
      setPurchaseSuccess(
        planId === PLAN_IDS.oneSite499 ? "Fix My Site" : "Full Intelligence"
      );
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.plan() });
      router.refresh();
    } catch {
      setError("Purchase failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.plan}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardPlan.subtitle}</p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-surface/40 p-6">
        <p className="text-xs uppercase tracking-wider text-muted">Current plan</p>
        <p className="mt-2 font-heading text-xl font-semibold text-ghost-white">
          {summary.planBadge}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-muted">{copy.dashboardPlan.freeStatus}</p>
            <p className="text-ghost-white">
              {summary.freeScanAvailable
                ? copy.dashboardPlan.freeAvailable
                : copy.dashboardPlan.freeUsed}
            </p>
          </div>
          {summary.auditsLimit != null && (
            <div>
              <p className="text-muted">Monthly audit quota</p>
              <p className="text-ghost-white">
                {summary.auditsUsedPeriod} / {summary.auditsLimit}
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-heading text-lg font-semibold text-ghost-white">
          {copy.dashboardPlan.ownedTitle}
        </h3>
        {(unboundCounts.standard > 0 || unboundCounts.deep > 0) && (
          <p className="mt-2 text-sm text-muted">
            {[
              unboundCounts.standard > 0 &&
                copy.dashboardPlan.unboundCount(unboundCounts.standard, "Fix My Site"),
              unboundCounts.deep > 0 &&
                copy.dashboardPlan.unboundCount(unboundCounts.deep, "Full Intelligence"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {purchases.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{copy.dashboardPlan.noPurchases}</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {purchases.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-border/60 bg-midnight/40 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ghost-white">{p.planLabel}</p>
                  {!p.isBound && (
                    <span className="shrink-0 rounded-full bg-violet/15 px-2 py-0.5 text-xs font-medium text-violet">
                      {copy.dashboardPlan.purchaseReady}
                    </span>
                  )}
                </div>
                {p.isBound && p.domain ? (
                  <p className="mt-1 text-sm text-muted">{p.domain}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    {copy.dashboardPlan.purchaseBindOnFirstAudit}
                  </p>
                )}
                {p.amountInr != null && (
                  <p className="mt-2 text-lg font-semibold text-violet">₹{p.amountInr}</p>
                )}
                {p.purchasedAt && (
                  <p className="mt-1 text-xs text-muted-light">
                    Purchased {new Date(p.purchasedAt).toLocaleDateString("en-IN")}
                  </p>
                )}
                {p.isBound && (
                  <p className="mt-2 text-xs text-muted-light">
                    {copy.dashboardPlan.permanentAccess}
                  </p>
                )}
                {p.planId === PLAN_IDS.deep999 && p.isBound && p.rescansRemaining > 0 && (
                  <p className="mt-2 text-xs text-violet">
                    {p.rescansExpiresAt ? (
                      <>
                        Re-scan: {p.rescansRemaining} left until{" "}
                        {formatRescanExpiry(new Date(p.rescansExpiresAt))}
                      </>
                    ) : (
                      <>Re-scan: included — starts after your first deep audit</>
                    )}
                  </p>
                )}
                {!p.isBound && (
                  <Button
                    variant="glow"
                    size="md"
                    className="mt-4 w-full"
                    onClick={() => openNewAudit()}
                  >
                    Start audit
                  </Button>
                )}
                {p.isBound &&
                  p.planId === PLAN_IDS.deep999 &&
                  p.rescansRemaining > 0 &&
                  p.rescansExpiresAt &&
                  new Date(p.rescansExpiresAt) > new Date() &&
                  p.domain && (
                    <button
                      type="button"
                      onClick={() =>
                        openNewAudit({
                          url: `https://${p.domain}`,
                          preset: "rescan",
                        })
                      }
                      className="mt-3 w-full rounded-xl border border-violet/40 bg-violet/10 px-3 py-2 text-sm font-medium text-violet"
                    >
                      {copy.dashboardOverview.actions.startRescan}
                    </button>
                  )}
                {p.isBound && p.latestMissionId && (
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/results/${p.latestMissionId}`}
                      className="rounded-xl border border-border px-3 py-2 text-sm text-ghost-white/80 hover:text-ghost-white"
                    >
                      View report
                    </Link>
                    <a
                      href={`/api/reports/${p.latestMissionId}/pdf?download=1`}
                      className="rounded-xl bg-violet/10 px-3 py-2 text-sm text-violet"
                    >
                      PDF
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {process.env.NODE_ENV === "development" ? (
      <section>
        <h3 className="font-heading text-lg font-semibold text-ghost-white">
          {copy.dashboardPlan.upgradeTitle}
        </h3>
        <p className="mt-1 text-sm text-muted">{copy.dashboardPlan.purchaseIntro}</p>
        <p className="mt-1 text-xs text-muted">{copy.dashboardPlan.devPurchaseNote}</p>
        {purchaseSuccess && (
          <div className="mt-4 rounded-xl border border-neon-green/30 bg-neon-green/5 p-4">
            <p className="text-sm text-neon-green">
              {copy.dashboardPlan.purchaseSuccess} ({purchaseSuccess})
            </p>
            <Button
              variant="glow"
              size="md"
              className="mt-3"
              onClick={() => openNewAudit()}
            >
              {copy.dashboardPlan.runFirstAudit}
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[PLAN_IDS.oneSite499, PLAN_IDS.deep999].map((planId) => {
            const meta = PRODUCT_METADATA[planId];
            const label =
              planId === PLAN_IDS.oneSite499 ? "Fix My Site" : "Full Intelligence";
            return (
              <article
                key={planId}
                className="rounded-2xl border border-violet/20 bg-violet/5 p-5"
              >
                <p className="font-medium text-ghost-white">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-violet">
                  ₹{PRODUCT_PRICES_INR[planId]}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-light">
                  {meta.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Button
                  variant="glow"
                  size="md"
                  className="mt-4"
                  isLoading={loading === planId}
                  onClick={() => handlePurchase(planId)}
                >
                  Get {label} — ₹{PRODUCT_PRICES_INR[planId]}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
      ) : <section className="surface-panel p-6"><h3 className="font-heading text-lg font-semibold">Early access is active</h3><p className="mt-2 text-sm text-muted-light">Approved accounts can run Full Intelligence audits while payments are offline. No checkout is needed.</p><Button className="mt-5" onClick={() => openNewAudit()}>Start an audit</Button></section>}

      <section className="rounded-2xl border border-border/60 bg-midnight/40 p-6">
        <h3 className="font-heading text-lg font-semibold text-ghost-white">
          {copy.dashboardPlan.agencyTitle}
        </h3>
        {agencyActive ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-neon-green">{copy.dashboardPlan.agencyActive}</p>
            {summary.auditsLimit != null && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  {copy.dashboardAgency.quotaTitle}
                </p>
                <p className="mt-1 text-lg font-semibold text-ghost-white">
                  {summary.auditsUsedPeriod} / {summary.auditsLimit}
                </p>
                {summary.periodResetAt && (
                  <p className="mt-1 text-xs text-muted-light">
                    Resets {formatRescanExpiry(summary.periodResetAt)}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/clients">
                <Button variant="secondary" size="md">
                  {copy.dashboardShell.nav.clients}
                </Button>
              </Link>
              <Link href="/dashboard/branding">
                <Button variant="secondary" size="md">
                  {copy.dashboardAgency.manageBranding}
                </Button>
              </Link>
              <Button variant="glow" size="md" onClick={() => openNewAudit()}>
                {copy.dashboardShell.newAudit}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted">{copy.dashboardPlan.agencyBody}</p>
            <ul className="mt-4 space-y-1 text-sm text-muted-light">
              {copy.dashboardAgency.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {process.env.NODE_ENV === "development" ? <>
            <p className="mt-3 text-xs text-muted">{copy.dashboardAgency.subscribeNote}</p>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <Button
              variant="glow"
              size="md"
              className="mt-4"
              isLoading={agencyLoading}
              onClick={handleAgencySubscribe}
            >
              {copy.dashboardAgency.subscribeCta}
            </Button></> : <a href="https://wa.me/918019013032" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm text-violet">Discuss agency access →</a>}
          </div>
        )}
      </section>
    </div>
  );
}
