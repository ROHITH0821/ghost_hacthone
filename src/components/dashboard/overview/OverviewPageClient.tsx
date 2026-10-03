"use client";

import { GhostMark } from "@/components/ui/GhostMark";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { getScoreLabel } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { AuditRow } from "@/components/dashboard/AuditRow";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import type { OverviewMissionRow } from "@/lib/db/missions";
import type { PlanSummary } from "@/lib/db/entitlements";
import type { FixCounts } from "@/lib/db/fix-workflow";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import { PLAN_IDS, formatRescanExpiry } from "@/lib/plans";
import { copy } from "@/lib/copy";
import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

function greetingName(email: string) {
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function greetingForHour(hour: number) {
  if (hour < 12) return copy.dashboardOverview.greeting.morning;
  if (hour < 17) return copy.dashboardOverview.greeting.afternoon;
  return copy.dashboardOverview.greeting.evening;
}

/**
 * The server and the visitor are rarely in the same timezone, so reading the
 * clock during render produced different text on each side — a hydration
 * mismatch that made React throw away the server HTML and re-render this tree.
 * Render UTC first (deterministic on both sides), then correct after mount.
 */
function useTimeGreeting() {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return greeting;
}

function scoreBand(score: number | null | undefined) {
  if (score == null) return copy.dashboardOverview.score.noData;
  return getScoreLabel(score);
}

function buildAttentionItems(
  missions: OverviewMissionRow[],
  planSummary: PlanSummary,
  openRescan: () => void
) {
  const items: Array<{
    severity: string;
    title: string;
    action: string;
    href?: string;
    onClick?: () => void;
  }> = [];

  for (const mission of missions) {
    if (mission.status === "error") {
      items.push({
        severity: "Failed",
        title: `${mission.domain} blocked or failed the audit`,
        action: copy.dashboardOverview.actions.retry,
        href: `/mission/${mission.id}`,
      });
    } else if (mission.status === "running") {
      items.push({
        severity: "Running",
        title: `${mission.domain} audit in progress`,
        action: copy.dashboardOverview.actions.continue,
        href: `/mission/${mission.id}`,
      });
    } else if (
      mission.status === "complete" &&
      mission.topLeakTitle &&
      (mission.topLeakSeverity === "critical" || mission.topLeakSeverity === "high")
    ) {
      items.push({
        severity: mission.topLeakSeverity === "critical" ? "Critical" : "High",
        title: mission.topLeakTitle,
        action: copy.dashboardOverview.actions.reviewFix,
        href: `/results/${mission.id}#findings`,
      });
    }
  }

  if (
    planSummary.rescansRemaining > 0 &&
    planSummary.domain &&
    planSummary.rescansExpiresAt &&
    planSummary.rescansExpiresAt > new Date()
  ) {
    items.push({
      severity: "Re-scan",
      title: `Verify changes on ${planSummary.domain}`,
      action: copy.dashboardOverview.actions.startRescan,
      onClick: openRescan,
    });
  }

  return items.slice(0, 5);
}

function buildNextAction(
  missions: OverviewMissionRow[],
  planSummary: PlanSummary,
  openRescan: () => void
) {
  const latestComplete = missions.find((m) => m.status === "complete");

  if (planSummary.primaryPlanId === PLAN_IDS.free) {
    return {
      title: copy.dashboardOverview.nextAction.freeTitle,
      body: copy.dashboardOverview.nextAction.freeBody,
      action: copy.dashboardOverview.nextAction.freeCta,
      href: "#scan",
    };
  }

  if (latestComplete?.topLeakTitle) {
    return {
      title: latestComplete.topLeakTitle,
      body: copy.dashboardOverview.nextAction.fixBody,
      action: copy.dashboardOverview.actions.openFix,
      href: "/dashboard/fixes",
    };
  }

  if (
    planSummary.rescansRemaining > 0 &&
    planSummary.rescansExpiresAt &&
    planSummary.rescansExpiresAt > new Date()
  ) {
    return {
      title: copy.dashboardOverview.nextAction.rescanTitle,
      body: copy.dashboardOverview.nextAction.rescanBody,
      action: copy.dashboardOverview.actions.startRescan,
      onClick: openRescan,
    };
  }

  return {
    title: copy.dashboardOverview.nextAction.defaultTitle,
    body: copy.dashboardOverview.nextAction.defaultBody,
    action: copy.dashboardOverview.actions.newAudit,
    href: "#scan",
  };
}

export function OverviewPageClient() {
  const { data, isPending, isError, error, isFetching, refetch } = useDashboardQuery<{
    missions: OverviewMissionRow[];
    fixCounts: FixCounts;
    runningQueue: Array<{
      id: string;
      domain: string;
      clientName: string | null;
      clientDomain: string | null;
    }>;
  }>({
    queryKey: dashboardKeys.overview(),
    path: "/api/dashboard/overview",
  });

  const { user, planSummary, isAgencyUser } = useDashboard();
  const { openNewAudit } = useNewAudit();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const greeting = useTimeGreeting();

  const openRescan = useCallback(() => {
    if (planSummary.domain) {
      openNewAudit({
        url: `https://${planSummary.domain}`,
        preset: "rescan",
      });
    }
  }, [openNewAudit, planSummary.domain]);

  // Landing / login can deep-link here with ?newAudit=1&url=… to open the modal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("newAudit") !== "1") return;
    const prefill = params.get("url")?.trim() ?? "";
    openNewAudit({ url: prefill || undefined });
    router.replace("/dashboard/overview", { scroll: false });
  }, [openNewAudit, router]);

  const missions = useMemo(() => data?.missions ?? [], [data?.missions]);
  const fixCounts = data?.fixCounts ?? {
    recommended: 0,
    in_progress: 0,
    implemented: 0,
    verified: 0,
    dismissed: 0,
  };
  const runningQueue = data?.runningQueue ?? [];

  const latestScore = missions.find((m) => m.status === "complete" && m.score != null)?.score;
  const criticalTotal = missions.reduce(
    (sum, m) => sum + (m.criticalCount ?? 0),
    0
  );

  const attentionItems = useMemo(
    () => buildAttentionItems(missions, planSummary, openRescan),
    [missions, planSummary, openRescan]
  );

  const nextAction = useMemo(
    () => buildNextAction(missions, planSummary, openRescan),
    [missions, planSummary, openRescan]
  );

  const quotaExhausted =
    isAgencyUser &&
    planSummary.auditsLimit != null &&
    planSummary.auditsUsedPeriod >= planSummary.auditsLimit;

  const handleScanSubmit = () => {
    if (!url.trim()) return;
    openNewAudit({ url: url.trim() });
  };

  if (isPending && !data) {
    return <DashboardPageLoading />;
  }

  if (isError) return <FeedbackState title="Your overview couldn’t load" description="Check your connection and try again. Your saved audits are still in your workspace." onRetry={() => void refetch()} />;

  return (
    <div className="space-y-8">
      {isFetching && data ? (
        <p className="text-xs text-muted">Refreshing…</p>
      ) : null}
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white md:text-3xl">
          {greeting}, {greetingName(user.email)}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardOverview.subtitle}</p>
        <p className="mt-3 inline-flex rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
          {planSummary.planBadge}
        </p>
      </header>

      {missions.length > 0 && (
      <section className="rounded-2xl border border-violet/20 bg-violet/5 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-violet">
          {copy.dashboardOverview.nextAction.label}
        </p>
        <h3 className="mt-2 font-heading text-xl font-semibold text-ghost-white">
          {nextAction.title}
        </h3>
        <p className="mt-2 text-sm text-muted-light">{nextAction.body}</p>
        <div className="mt-4">
          {"onClick" in nextAction && nextAction.onClick ? (
            <Button variant="glow" size="md" onClick={nextAction.onClick}>
              {nextAction.action}
            </Button>
          ) : nextAction.href?.startsWith("#") ? (
            <Button
              variant="glow"
              size="md"
              onClick={() =>
                document.getElementById(nextAction.href!.slice(1))?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              {nextAction.action}
            </Button>
          ) : nextAction.href ? (
            <Link href={nextAction.href}>
              <Button variant="glow" size="md">
                {nextAction.action}
              </Button>
            </Link>
          ) : null}
        </div>
      </section>
      )}
      {isAgencyUser && runningQueue.length > 0 && (
      <section className="rounded-2xl border border-violet/20 bg-violet/5 p-5">
          <h3 className="font-heading text-lg font-semibold text-ghost-white">
            {copy.dashboardAgency.queueTitle}
          </h3>
          <ul className="mt-4 space-y-2">
            {runningQueue.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-midnight/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-violet">
                    Running
                  </p>
                  <p className="mt-1 text-sm text-ghost-white/90">
                    {item.clientName ? `${item.clientName} · ` : ""}
                    {item.domain}
                  </p>
                </div>
                <Link
                  href={`/mission/${item.id}`}
                  className="shrink-0 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
                >
                  {copy.dashboardOverview.actions.continue}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missions.length > 0 && (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isAgencyUser && planSummary.auditsLimit != null ? (
          <SummaryCard
            label={copy.dashboardAgency.quotaTitle}
            value={`${planSummary.auditsUsedPeriod} / ${planSummary.auditsLimit}`}
            hint={
              planSummary.periodResetAt
                ? `Resets ${formatRescanExpiry(planSummary.periodResetAt)}`
                : undefined
            }
            hintClass={quotaExhausted ? "text-danger/80" : "text-violet/80"}
          />
        ) : null}
        <SummaryCard
          label={copy.dashboardOverview.cards.latestScore}
          value={latestScore != null ? String(Math.round(latestScore)) : "—"}
          hint={scoreBand(latestScore)}
        />
        <SummaryCard
          label={copy.dashboardOverview.cards.criticalSpots}
          value={String(criticalTotal)}
          hint={
            criticalTotal > 0
              ? copy.dashboardOverview.cards.needsAttention
              : copy.dashboardOverview.cards.allClear
          }
          hintClass={criticalTotal > 0 ? "text-danger/80" : "text-neon-green/80"}
        />
        <SummaryCard
          label={copy.dashboardOverview.cards.fixesImplemented}
          value={String(fixCounts.implemented)}
          hint={copy.dashboardOverview.cards.fixesHint}
        />
        {!isAgencyUser ? (
          <SummaryCard
            label={copy.dashboardOverview.cards.entitlement}
            value={planSummary.entitlementLabel}
            hint={planSummary.entitlementAction}
            largeValue
          />
        ) : null}
      </section>
      )}

      <section id="scan" className="rounded-2xl border border-border bg-surface/40 p-5 backdrop-blur-sm">
        {quotaExhausted ? (
          <div className="text-center">
            <p className="font-heading text-base font-semibold text-ghost-white">
              {copy.dashboardAgency.quotaExhaustedTitle.replace(
                "30 of 30",
                `${planSummary.auditsUsedPeriod} of ${planSummary.auditsLimit}`
              )}
            </p>
            <p className="mt-2 text-sm text-muted">{copy.dashboardAgency.quotaExhaustedBody}</p>
            {planSummary.periodResetAt && (
              <p className="mt-2 text-xs text-violet">
                Resets {formatRescanExpiry(planSummary.periodResetAt)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard/audits">
                <Button variant="secondary" size="md">
                  View audits
                </Button>
              </Link>
              <Link href="/dashboard/plan">
                <Button variant="secondary" size="md">
                  Manage plan
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 font-heading text-base font-semibold text-ghost-white">
              {copy.dashboardOverview.scanLabel}
            </p>
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <input
                  id="dashboard-url"
                  aria-label="Website to audit"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                  placeholder={copy.dashboardOverview.urlPlaceholder}
                  className="w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-base text-ghost-white outline-none placeholder:text-muted focus:border-violet/40"
                />
                <Button
                  variant="glow"
                  size="md"
                  onClick={handleScanSubmit}
                  disabled={!url.trim()}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {copy.dashboardShell.newAudit}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>


      {missions.length > 0 ? <>
      <section>
        <h3 className="font-heading text-lg font-semibold text-ghost-white">
          {copy.dashboardOverview.attentionTitle}
        </h3>
        {attentionItems.length === 0 ? (
          <div className="mt-4 rounded-[14px] border border-dashed border-[#D6D7D1] bg-mist/60 p-10 text-center">
            <span aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-line bg-paper"><GhostMark className="h-6 w-6" /></span>
            <p className="text-sm font-medium text-ink">
              {missions.length === 0
                ? copy.dashboardOverview.emptyTitle
                : copy.dashboardOverview.attentionClear}
            </p>
            {missions.length === 0 && (
              <p className="mt-2 text-xs text-muted">{copy.dashboardOverview.emptyBody}</p>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {attentionItems.map((item, i) => (
              <li
                key={`${item.title}-${i}`}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-midnight/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    {item.severity}
                  </p>
                  <p className="mt-1 text-sm text-ghost-white/90">{item.title}</p>
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
                  >
                    {item.action}
                  </Link>
                ) : item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="shrink-0 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
                  >
                    {item.action}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-ghost-white">
            {copy.dashboardOverview.recentTitle}
          </h3>
        </div>
        {missions.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-midnight/40 p-6 text-center">
            <p className="text-sm text-muted">{copy.dashboardOverview.emptyBody}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => (
              <AuditRow key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </section>

      </> : <section className="grid gap-6 border-t border-border/60 pt-6 md:grid-cols-3" aria-label="Your first audit">
        {[["01", "Add your website", "Tell Ghost which public site to review and what your customers need to do."], ["02", "Review the findings", "See potential obstacles, the supporting evidence, and recommended fixes."], ["03", "Track your improvements", "Plan and implement fixes, then use an eligible re-scan to check the changes."]].map(([n,title,body]) => <div key={n}><p className="eyebrow">{n}</p><h3 className="mt-2 text-base font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-light">{body}</p></div>)}
      </section>}

    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  hintClass,
  largeValue,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
  largeValue?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`mt-2 font-heading font-semibold text-ghost-white ${
          largeValue ? "text-base leading-snug" : "text-3xl"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className={`mt-2 text-xs ${hintClass ?? "text-muted-light"}`}>{hint}</p>
      )}
    </div>
  );
}
