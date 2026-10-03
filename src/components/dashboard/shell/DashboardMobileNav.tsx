"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MoreHorizontal, Wrench, BarChart3 } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function DashboardMobileNav({
  onMore,
  comparisonsNavVisible: _comparisonsNavVisible,
}: {
  onMore: () => void;
  comparisonsNavVisible: boolean;
}) {
  const pathname = usePathname();
  const nav = copy.dashboardShell.mobileNav;

  const items = [
    {
      href: "/dashboard/overview",
      label: nav.overview,
      icon: LayoutDashboard,
      active: pathname === "/dashboard/overview" || pathname === "/dashboard",
      disabled: false,
    },
    {
      href: "/dashboard/audits",
      label: nav.audits,
      icon: BarChart3,
      active: pathname === "/dashboard/audits",
      disabled: false,
    },
    {
      href: "/dashboard/fixes",
      label: nav.fixes,
      icon: Wrench,
      active: pathname === "/dashboard/fixes",
      disabled: false,
    },
  ];

  return (
    <nav aria-label="Workspace navigation" className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-navy/95 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 px-2 py-3 text-muted/50"
                aria-disabled="true"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-3 transition-colors",
                item.active ? "text-violet" : "text-muted-light"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center gap-1 px-2 py-3 text-muted-light"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px]">{nav.more}</span>
        </button>
      </div>
    </nav>
  );
}
