"use client";

import { GhostMark } from "@/components/ui/GhostMark";
import { FeedbackState } from "@/components/ui/FeedbackState";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteCard } from "@/components/dashboard/sites/SiteCard";
import type { SiteDashboardRow } from "@/lib/db/sites";
import { copy } from "@/lib/copy";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";
import { useQueryClient } from "@tanstack/react-query";

export function SitesPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");

  const { data, isPending, isError, error, refetch } = useDashboardQuery<{
    sites: SiteDashboardRow[];
  }>({
    queryKey: dashboardKeys.sites(),
    path: "/api/dashboard/sites/list",
  });

  const [sites, setSites] = useState<SiteDashboardRow[]>([]);

  useEffect(() => {
    if (data?.sites) setSites(data.sites);
  }, [data?.sites]);

  if (isPending && sites.length === 0) return <DashboardPageLoading />;
  if (isError) return <FeedbackState title="Couldn’t load sites" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;

  const filtered = sites.filter((s) =>
    tab === "archived" ? s.archivedAt : !s.archivedAt
  );

  async function handleArchiveToggle(siteId: string, action: "archive" | "unarchive") {
    setActionError("");
    try {
      const response = await fetch(`/api/dashboard/sites/${siteId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Update failed");
    } catch {
      setActionError("The website could not be updated. Try again; its status has not changed.");
      return;
    }

    setSites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? { ...s, archivedAt: action === "archive" ? new Date() : null }
          : s
      )
    );
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.sites() });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.sites}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardSites.subtitle}</p>
      </header>

      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      <div className="flex gap-2">
        {(["active", "archived"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              tab === t
                ? "bg-violet/15 text-violet"
                : "border border-border/60 text-muted-light hover:text-ghost-white"
            }`}
          >
            {t === "active" ? copy.dashboardSites.active : copy.dashboardSites.archived}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#D6D7D1] bg-mist/60 p-10 text-center">
          <span aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-line bg-paper"><GhostMark className="h-6 w-6" /></span>
          <p className="font-medium text-ink">{tab === "archived" ? "No archived websites" : copy.dashboardSites.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted">{tab === "archived" ? "Websites you archive will appear here. You can restore them at any time." : copy.dashboardSites.emptyBody}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((site) => (
            <SiteCard key={site.id} site={site} onArchiveToggle={handleArchiveToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
