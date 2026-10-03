"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { PlanSummary } from "@/lib/db/entitlements";
import { copy } from "@/lib/copy";
import { DashboardProvider, type DashboardUser } from "./DashboardContext";
import { DashboardMobileNav } from "./DashboardMobileNav";
import { DashboardMobileMoreSheet, DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { NewAuditProvider } from "../new-audit/NewAuditContext";
import { NewAuditModal } from "../new-audit/NewAuditModal";
import { DashboardQueryProvider } from "@/components/providers/DashboardQueryProvider";

const SIDEBAR_KEY = "ghost-dashboard-sidebar-collapsed";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": copy.dashboardShell.pages.overview,
  "/dashboard/overview": copy.dashboardShell.pages.overview,
  "/dashboard/sites": copy.dashboardShell.pages.sites,
  "/dashboard/audits": copy.dashboardShell.pages.audits,
  "/dashboard/plan": copy.dashboardShell.pages.plan,
  "/dashboard/settings": copy.dashboardShell.pages.settings,
  "/dashboard/fixes": copy.dashboardShell.pages.fixes,
  "/dashboard/comparisons": copy.dashboardShell.pages.comparisons,
  "/dashboard/clients": copy.dashboardShell.pages.clients,
  "/dashboard/branding": copy.dashboardShell.pages.branding,
};

export function DashboardShell({
  user,
  planSummary,
  comparisonsNavVisible,
  isAgencyUser,
  children,
}: {
  user: DashboardUser;
  planSummary: PlanSummary;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardQueryProvider>
      <NewAuditProvider>
        <DashboardShellInner
          user={user}
          planSummary={planSummary}
          comparisonsNavVisible={comparisonsNavVisible}
          isAgencyUser={isAgencyUser}
        >
          {children}
        </DashboardShellInner>
      </NewAuditProvider>
    </DashboardQueryProvider>
  );
}

function DashboardShellInner({
  user,
  planSummary,
  comparisonsNavVisible,
  isAgencyUser,
  children,
}: {
  user: DashboardUser;
  planSummary: PlanSummary;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(SIDEBAR_KEY) === "true") setCollapsed(true); } catch { /* Storage is optional. */ }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  }, []);

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/dashboard/clients/")) return "Client details";
    return PAGE_TITLES[pathname] ?? copy.dashboardShell.pages.overview;
  }, [pathname]);

  return (
    <DashboardProvider
      user={user}
      planSummary={planSummary}
      comparisonsNavVisible={comparisonsNavVisible}
      isAgencyUser={isAgencyUser}
    >
      <div className="flex min-h-screen bg-paper">
        <DashboardSidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          comparisonsNavVisible={comparisonsNavVisible}
          isAgencyUser={isAgencyUser}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopBar title={pageTitle} />

          <main id="main-content" tabIndex={-1} className="dashboard-content min-w-0 flex-1 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        <DashboardMobileNav
          onMore={() => setMoreOpen(true)}
          comparisonsNavVisible={comparisonsNavVisible}
        />
        <DashboardMobileMoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          comparisonsNavVisible={comparisonsNavVisible}
          isAgencyUser={isAgencyUser}
        />
      </div>
      <NewAuditModal />
    </DashboardProvider>
  );
}
