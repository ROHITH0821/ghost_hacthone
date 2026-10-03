"use client";

import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  CreditCard,
  Globe,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardContext";
import { DashboardNavItem } from "./DashboardNavItem";

const NAV_ITEMS = [
  {
    href: "/dashboard/overview",
    labelKey: "overview" as const,
    icon: LayoutDashboard,
    disabled: false,
    conditional: false,
  },
  {
    href: "/dashboard/sites",
    labelKey: "sites" as const,
    icon: Globe,
    disabled: false,
    conditional: false,
  },
  {
    href: "/dashboard/audits",
    labelKey: "audits" as const,
    icon: BarChart3,
    disabled: false,
    conditional: false,
  },
  {
    href: "/dashboard/fixes",
    labelKey: "fixes" as const,
    icon: Wrench,
    disabled: false,
    conditional: false,
  },
  {
    href: "/dashboard/clients",
    labelKey: "clients" as const,
    icon: Users,
    disabled: false,
    conditional: true,
    agencyOnly: true,
  },
  {
    href: "/dashboard/comparisons",
    labelKey: "comparisons" as const,
    icon: BarChart3,
    disabled: true,
    conditional: true,
  },
  {
    href: "/dashboard/plan",
    labelKey: "plan" as const,
    icon: CreditCard,
    disabled: false,
    conditional: false,
  },
  {
    href: "/dashboard/branding",
    labelKey: "branding" as const,
    icon: Palette,
    disabled: false,
    conditional: true,
    agencyOnly: true,
  },
  {
    href: "/dashboard/settings",
    labelKey: "settings" as const,
    icon: Settings,
    disabled: false,
    conditional: false,
  },
];

export function DashboardSidebar({
  collapsed,
  onToggle,
  comparisonsNavVisible,
  isAgencyUser,
}: {
  collapsed: boolean;
  onToggle: () => void;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
}) {
  const pathname = usePathname();
  const { user, planSummary } = useDashboard();
  const nav = copy.dashboardShell.nav;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-mist/70 md:flex",
        collapsed ? "w-[76px]" : "w-[228px]"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-line px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard/overview" className="flex items-center gap-2">
            <GhostLogo size="sm" linked={false} />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-graphite transition-colors hover:border-[#C9CAC4] hover:text-ink"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav aria-label="Workspace navigation" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {!collapsed && <p className="mono-label px-3 pb-2 pt-1 text-[10px] text-ash-text">Workspace</p>}
        {NAV_ITEMS.filter(
          (item) => !("agencyOnly" in item && item.agencyOnly) || isAgencyUser
        ).map((item) => {
          const Icon = item.icon;
          const label = nav[item.labelKey];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`) ||
            (item.href === "/dashboard/overview" && pathname === "/dashboard");
          const disabled =
            item.conditional && item.labelKey === "comparisons"
              ? !comparisonsNavVisible
              : false;

          return (
            <DashboardNavItem
              key={item.labelKey}
              href={item.href}
              label={label}
              icon={<Icon className="h-4 w-4" />}
              active={active}
              disabled={false}
              collapsed={collapsed}
              soon={false}
            />
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        {!collapsed && (
          <div className="mb-3 rounded-[12px] border border-line bg-paper px-3 py-2.5">
            <p className="mono-label flex items-center gap-1.5 text-[10px] text-ash-text"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-resolved" />Current plan</p>
            <p className="mt-1 truncate text-sm font-medium text-ghost-white">
              {planSummary.planBadge}
            </p>
          </div>
        )}
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-paper",
            collapsed && "justify-center"
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium uppercase text-paper">
            {user.email.charAt(0)}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <p className="truncate text-sm text-ink">{user.email}</p>
              <p className="text-xs text-ash-text">{nav.settings}</p>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export function DashboardMobileMoreSheet({
  open,
  onClose,
  comparisonsNavVisible,
  isAgencyUser,
}: {
  open: boolean;
  onClose: () => void;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
}) {
  const pathname = usePathname();
  const nav = copy.dashboardShell.nav;

  if (!open) return null;

  const moreItems = NAV_ITEMS.filter(
    (item) => !["overview", "audits", "fixes"].includes(item.labelKey)
  );

  return (
    <Dialog open={open} onClose={onClose} labelledBy="more-nav-title" className="md:hidden">
      <div className="max-h-[80dvh] overflow-y-auto p-5" onClick={event=>{if((event.target as HTMLElement).closest('a'))onClose();}}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="more-nav-title" className="font-heading text-lg font-medium tracking-[-0.02em] text-ink">Workspace</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-graphite hover:text-ink"
            aria-label="Close"
          >
            <ChevronLeft className="h-5 w-5 rotate-[-90deg]" />
          </button>
        </div>
        <div className="space-y-1">
          {moreItems
            .filter((item) => !("agencyOnly" in item && item.agencyOnly) || isAgencyUser)
            .map((item) => {
            const Icon = item.icon;
            const label = nav[item.labelKey];
            const active = pathname === item.href;
            const disabled =
              item.conditional && item.labelKey === "comparisons"
                ? !comparisonsNavVisible
                : false;

            return (
              <DashboardNavItem
                key={item.labelKey}
                href={item.href}
                label={label}
                icon={<Icon className="h-4 w-4" />}
                active={active}
                disabled={false}
                soon={false}
              />
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
