"use client";

import { GhostMark } from "@/components/ui/GhostMark";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RescanComparison, RescanPair } from "@/lib/db/comparisons";
import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { isMarketIntelPending } from "@/lib/competitor-intelligence/intel-pending";
import { copy } from "@/lib/copy";
import { useNewAudit } from "@/components/dashboard/new-audit/NewAuditContext";
import { MarketIntelligenceSection } from "@/components/results/MarketIntelligenceSection";
import { IntelFailureBanner } from "@/components/results/IntelFailureBanner";
import {
  RescanComparisonView,
  formatMissionLabel,
} from "./RescanComparisonView";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";
import {
  Compass,
  TrendingUp,
  Globe,
  ChevronDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Search,
  Zap,
  Loader2,
} from "lucide-react";

type SiteOption = {
  key: string;
  siteId: string | null;
  domain: string;
  missionId: string;
  createdAt: string;
  hasIntel?: boolean;
  intelStatus?: string | null;
};

type ComparisonPayload = {
  pairs: RescanPair[];
  comparison: RescanComparison | null;
  verifiedFixes: Array<{ id: string; title: string }>;
  competitorIntelligence?: CompetitorIntelligence | null;
  marketIntelligenceMissionId?: string | null;
  marketIntelExpected?: boolean;
  hasCompetitorCrawlPacks?: boolean;
  intelError?: string | null;
  intelStatus?: string | null;
  hasIntel?: boolean;
  sites?: SiteOption[];
  selectedSiteKey?: string | null;
  baselineMission?: {
    id: string;
    createdAt: string;
    auditType: string;
    domain: string;
  };
  rescanMission?: {
    id: string;
    createdAt: string;
    auditType: string;
    domain: string;
  };
};

function pairsForSite(pairs: RescanPair[], site: SiteOption | null): RescanPair[] {
  if (!site) return pairs;
  if (site.siteId) return pairs.filter((p) => p.siteId === site.siteId);
  return pairs.filter(
    (p) => p.siteDomain.toLowerCase() === site.domain.toLowerCase(),
  );
}

export function ComparisonsPageClient() {
  const { openNewAudit } = useNewAudit();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSiteId = searchParams.get("siteId") ?? "";

  const [data, setData] = useState<ComparisonPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenMessage, setRegenMessage] = useState<string | null>(null);
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | null>(
    requestedSiteId || null,
  );
  const [activeTab, setActiveTab] = useState<"market" | "progress">("market");

  const { data: boot, isPending, isFetching, isError, error: loadError } =
    useDashboardQuery<{
      initial: ComparisonPayload | null;
    }>({
      queryKey: dashboardKeys.comparisons(requestedSiteId),
      path: `/api/dashboard/comparisons/bootstrap${
        requestedSiteId ? `?siteId=${encodeURIComponent(requestedSiteId)}` : ""
      }`,
      keepPreviousData: true,
      refetchInterval: (query) => {
        const payload = query.state.data?.initial;
        const list = payload?.sites ?? [];
        const key = payload?.selectedSiteKey;
        const site = list.find((s) => s.key === key) ?? list[0];
        if (
          site &&
          isMarketIntelPending({
            hasIntel: site.hasIntel ?? payload?.hasIntel,
            intelStatus: site.intelStatus ?? payload?.intelStatus,
          })
        ) {
          return 4000;
        }
        return false;
      },
    });

  const initial = boot?.initial ?? null;

  useEffect(() => {
    if (!initial) return;
    setData(initial);
    const nextKey =
      initial.selectedSiteKey ?? initial.sites?.[0]?.key ?? null;
    if (requestedSiteId) {
      const match =
        initial.sites?.find(
          (s) => s.key === requestedSiteId || s.siteId === requestedSiteId,
        ) ?? null;
      setSelectedSiteKey(match?.key ?? nextKey);
      return;
    }
    setSelectedSiteKey((prev) => prev ?? nextKey);
  }, [initial, requestedSiteId]);

  // Stable identities: `?? []` allocates a fresh array on every render, which
  // invalidated the memos below and re-ran the comparison work each time.
  const pairs = useMemo(() => data?.pairs ?? [], [data?.pairs]);
  const sites = useMemo(() => data?.sites ?? [], [data?.sites]);
  const marketIntel = data?.competitorIntelligence ?? null;
  const marketMissionId = data?.marketIntelligenceMissionId ?? null;
  const marketIntelExpected = data?.marketIntelExpected ?? false;
  const hasCompetitorCrawlPacks = data?.hasCompetitorCrawlPacks ?? false;
  const intelError = data?.intelError ?? null;
  const marketLoading =
    isFetching &&
    Boolean(requestedSiteId) &&
    initial?.selectedSiteKey !== requestedSiteId &&
    initial?.selectedSiteKey !== selectedSiteKey;

  const selectedSite = useMemo(
    () => sites.find((s) => s.key === selectedSiteKey) ?? sites[0] ?? null,
    [sites, selectedSiteKey],
  );
  const intelFailed =
    (selectedSite?.intelStatus ?? data?.intelStatus) === "failed";
  const intelPending = Boolean(
    selectedSite &&
      isMarketIntelPending({
        hasIntel: selectedSite.hasIntel ?? data?.hasIntel,
        intelStatus: selectedSite.intelStatus ?? data?.intelStatus,
      }),
  );

  const filteredPairs = useMemo(
    () => pairsForSite(pairs, selectedSite),
    [pairs, selectedSite],
  );

  const hasRescanComparison =
    !!data?.comparison &&
    !!selectedSite &&
    !!data.rescanMission &&
    data.rescanMission.domain.toLowerCase() === selectedSite.domain.toLowerCase();

  const selectedPairKey =
    data?.baselineMission && data?.rescanMission
      ? `${data.baselineMission.id}:${data.rescanMission.id}`
      : "";

  const baselineLabel = useMemo(() => {
    if (!data?.baselineMission) return "";
    return formatMissionLabel(
      data.baselineMission.auditType,
      data.baselineMission.createdAt,
    );
  }, [data]);

  const rescanLabel = useMemo(() => {
    if (!data?.rescanMission) return "";
    return formatMissionLabel(
      data.rescanMission.auditType,
      data.rescanMission.createdAt,
    );
  }, [data]);

  async function loadPair(baselineMissionId: string, rescanMissionId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/comparisons?baselineMissionId=${baselineMissionId}&rescanMissionId=${rescanMissionId}`,
      );
      if (!res.ok) {
        setError(copy.dashboardComparisons.loadError);
        return;
      }
      const json = await res.json();
      if (json.comparison) {
        setData((prev) => ({
          ...json,
          sites: json.sites ?? prev?.sites ?? sites,
          selectedSiteKey,
          competitorIntelligence:
            prev?.competitorIntelligence ?? json.competitorIntelligence ?? null,
          marketIntelligenceMissionId:
            prev?.marketIntelligenceMissionId ??
            json.marketIntelligenceMissionId ??
            null,
        }));
      }
    } catch {
      setError(copy.dashboardComparisons.loadError);
    } finally {
      setLoading(false);
    }
  }

  function onSiteChange(siteKey: string) {
    setSelectedSiteKey(siteKey);
    setError(null);
    setRegenMessage(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("siteId", siteKey);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function regenerateMarketIntel() {
    if (!marketMissionId) return;
    setRegenerating(true);
    setRegenMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/missions/${marketMissionId}/regenerate-market-intelligence`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError(
          typeof json.error === "string"
            ? json.error
            : copy.marketIntelligence.regenerateCooldown,
        );
        return;
      }
      if (!res.ok) {
        setError(copy.marketIntelligence.regenerateError);
        return;
      }
      if (json.competitorIntelligence) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                competitorIntelligence: json.competitorIntelligence,
              }
            : prev,
        );
        setRegenMessage(copy.marketIntelligence.regenerateSuccess);
      }
    } catch {
      setError(copy.marketIntelligence.regenerateError);
    } finally {
      setRegenerating(false);
    }
  }

  if (isPending && !data) return <DashboardPageLoading />;
  if (isError) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center shadow-lg">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" />
        <h3 className="mt-2 font-heading text-lg font-bold text-ghost-white">
          MARKET INTELLIGENCE COULDN&apos;T LOAD
        </h3>
        <p className="mt-1 text-sm text-danger/90">
          {loadError instanceof Error ? loadError.message : "Could not load comparison data. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet/20 text-violet border border-violet/40">
            <ArrowRightLeft className="h-3 w-3" />
          </span>
          <p className="label-caps font-mono tracking-widest text-violet-glow text-xs uppercase">
            COMPARISONS
          </p>
        </div>
        <h2 className="font-heading text-3xl font-extrabold text-ghost-white md:text-4xl tracking-tight">
          {copy.dashboardShell.pages.comparisons}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-light">
          {copy.dashboardComparisons.subtitle}
        </p>
      </header>

      {/* ERROR & SUCCESS NOTIFICATION BANNERS */}
      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 text-sm font-medium text-danger flex items-center gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
          <span>{error}</span>
        </div>
      )}
      {regenMessage && (
        <div className="rounded-2xl border border-resolved/30 bg-[#E4F4EC] px-5 py-4 text-sm font-medium text-resolved-text flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-resolved-text" />
          <span>{regenMessage}</span>
        </div>
      )}

      {/* CONTROLS BAR: SITE SELECTOR + VIEW MODE TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-midnight/60 p-3.5 backdrop-blur-md shadow-lg">
        {/* SITE SELECTOR */}
        {sites.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-muted-light pl-2">
              {copy.dashboardComparisons.selectSite}:
            </span>
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-1.5 text-violet">
                <Globe className="h-4 w-4" />
              </div>
              <select
                value={selectedSiteKey ?? ""}
                disabled={marketLoading}
                onChange={(e) => void onSiteChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border/80 bg-surface-elevated/90 pl-9 pr-9 py-2 text-xs font-semibold text-ghost-white focus:border-violet/60 focus:outline-none focus:ring-1 focus:ring-violet/40 shadow-inner transition-colors disabled:opacity-50"
              >
                {sites.map((s) => (
                  <option key={s.key} value={s.key} className="bg-midnight text-ghost-white">
                    {s.domain}
                    {isMarketIntelPending(s) ? " · researching…" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted" />
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* VIEW MODE TABS: MARKET VIEW / PROGRESS VIEW */}
        <div className="flex items-center rounded-xl border border-border/60 bg-surface/50 p-1 backdrop-blur-sm shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("market")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "market"
                ? "bg-violet text-white shadow-md"
                : "text-muted-light hover:text-ghost-white hover:bg-surface/30"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>MARKET VIEW</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("progress")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "progress"
                ? "bg-violet text-white shadow-md"
                : "text-muted-light hover:text-ghost-white hover:bg-surface/30"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>PROGRESS VIEW</span>
          </button>
        </div>
      </div>

      {/* MARKET VIEW CONTENT */}
      {activeTab === "market" && (
        <section className="space-y-6">
          {marketLoading ? (
            /* Market Loading Skeleton */
            <div className="space-y-6" aria-busy="true" aria-label={copy.dashboardComparisons.marketLoading}>
              <div className="h-16 ghost-skeleton !rounded-[14px] border border-line" />
              <div className="h-48 ghost-skeleton !rounded-[14px] border border-line" />
              <div className="h-64 ghost-skeleton !rounded-[14px] border border-line" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-40 ghost-skeleton !rounded-[14px] border border-line" />
                <div className="h-40 ghost-skeleton !rounded-[14px] border border-line" />
              </div>
            </div>
          ) : marketIntel ? (
            <MarketIntelligenceSection
              intelligence={marketIntel}
              compact
              reportMissionId={marketMissionId}
              onRegenerate={
                marketMissionId ? () => void regenerateMarketIntel() : undefined
              }
              regenerating={regenerating}
            />
          ) : intelPending ? (
            <div className="relative overflow-hidden rounded-2xl border border-violet/40 bg-gradient-to-b from-violet/10 to-surface/90 p-8 backdrop-blur-md shadow-2xl text-center">
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet/40 bg-violet/10 text-violet shadow-lg">
                <Loader2 className="h-7 w-7 animate-spin text-violet-glow" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-ghost-white md:text-2xl">
                {copy.dashboardComparisons.intelInProgressTitle}
              </h3>
              <p className="mt-2 text-sm text-muted-light max-w-md mx-auto">
                {copy.dashboardComparisons.intelInProgressBody}
              </p>
              {selectedSite?.domain && (
                <p className="mt-3 text-xs font-mono uppercase tracking-wider text-violet">
                  {selectedSite.domain}
                </p>
              )}
            </div>
          ) : (intelFailed || marketIntelExpected) && marketMissionId ? (
            <IntelFailureBanner
              missionId={marketMissionId}
              hasCompetitorCrawlPacks={hasCompetitorCrawlPacks}
              intelError={intelError}
              onRegenerate={() => void regenerateMarketIntel()}
              regenerating={regenerating}
              onNewAudit={() => openNewAudit()}
            />
          ) : (
            /* Premium Empty State for Market Intelligence */
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-surface-elevated/90 to-surface/90 p-8 backdrop-blur-md shadow-2xl text-center">
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet/40 bg-violet/10 text-violet shadow-lg">
                <Compass className="h-7 w-7 text-violet-glow" />
              </div>

              <h3 className="mt-4 font-heading text-xl font-bold text-ghost-white md:text-2xl">
                MARKET INTELLIGENCE
              </h3>

              <p className="mt-2 text-sm text-muted-light max-w-md mx-auto">
                Your market intelligence report isn&apos;t available yet.
              </p>

              <div className="mt-5 max-w-sm mx-auto rounded-xl border border-border/60 bg-midnight/60 p-4 text-left text-xs space-y-2">
                <p className="font-semibold text-ghost-white font-mono uppercase tracking-wider text-[10px]">
                  Run a Full Intelligence deep audit to unlock:
                </p>
                <ul className="space-y-1.5 text-muted-light font-medium pl-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet" />
                    <span>Market gaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet" />
                    <span>Competitor comparisons</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet" />
                    <span>Competitive advantages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet" />
                    <span>Market actions</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => openNewAudit()}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet/40 bg-violet px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-violet-dim transition-all active:scale-98"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{copy.dashboardComparisons.marketCta}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PROGRESS VIEW CONTENT (BEFORE / AFTER RE-SCAN) */}
      {activeTab === "progress" && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet" />
                <h3 className="font-heading text-xl font-bold text-ghost-white">
                  BEFORE / AFTER RE-SCAN
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                See what changed after you acted on Ghost&apos;s recommendations.
              </p>
            </div>

            {/* PAIR SELECTOR (IF MULTIPLE PAIRS EXIST) */}
            {hasRescanComparison && filteredPairs.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-light">
                  {copy.dashboardComparisons.selectPair}:
                </span>
                <div className="relative">
                  <select
                    value={selectedPairKey}
                    disabled={loading}
                    onChange={(e) => {
                      const [baselineMissionId, rescanMissionId] =
                        e.target.value.split(":");
                      if (baselineMissionId && rescanMissionId) {
                        void loadPair(baselineMissionId, rescanMissionId);
                      }
                    }}
                    className="appearance-none rounded-xl border border-border/80 bg-surface-elevated/90 px-3.5 py-2 pr-9 text-xs font-semibold text-ghost-white focus:border-violet/60 focus:outline-none focus:ring-1 focus:ring-violet/40 shadow-inner"
                  >
                    {filteredPairs.map((p) => (
                      <option
                        key={`${p.baselineMissionId}:${p.rescanMissionId}`}
                        value={`${p.baselineMissionId}:${p.rescanMissionId}`}
                        className="bg-midnight text-ghost-white"
                      >
                        {p.siteDomain} —{" "}
                        {new Date(p.baselineCreatedAt).toLocaleDateString()} →{" "}
                        {new Date(p.rescanCreatedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-muted" />
                </div>
              </div>
            )}
          </div>

          {!hasRescanComparison && (
            <div className="rounded-[14px] border border-dashed border-[#D6D7D1] bg-mist/60 p-10 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-paper">
                <GhostMark className="h-6 w-6" />
              </div>
              <h4 className="font-heading text-lg font-medium tracking-[-0.02em] text-ink">
                {copy.dashboardComparisons.emptyTitle}
              </h4>
              <p className="max-w-md mx-auto text-xs text-muted-light leading-relaxed">
                {copy.dashboardComparisons.emptyBody}
              </p>
            </div>
          )}

          {hasRescanComparison &&
            data?.comparison &&
            data.baselineMission &&
            data.rescanMission && (
              <div>
                {loading ? (
                  <div
                    className="space-y-6"
                    aria-busy="true"
                    aria-label={copy.dashboardComparisons.loadingComparison}
                  >
                    <div className="h-48 ghost-skeleton !rounded-[14px] border border-line" />
                    <div className="h-40 ghost-skeleton !rounded-[14px] border border-line" />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="h-32 ghost-skeleton !rounded-[14px] border border-line" />
                      <div className="h-32 ghost-skeleton !rounded-[14px] border border-line" />
                      <div className="h-32 ghost-skeleton !rounded-[14px] border border-line" />
                    </div>
                  </div>
                ) : (
                  <RescanComparisonView
                    comparison={data.comparison}
                    verifiedFixes={data.verifiedFixes}
                    baselineLabel={baselineLabel}
                    rescanLabel={rescanLabel}
                  />
                )}
              </div>
            )}
        </section>
      )}
    </div>
  );
}

