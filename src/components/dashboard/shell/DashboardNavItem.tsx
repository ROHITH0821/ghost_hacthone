"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchDashboardTab } from "@/lib/dashboard/prefetch";

export function DashboardNavItem({
  href,
  label,
  icon,
  active,
  disabled,
  collapsed,
  soon,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  soon?: boolean;
}) {
  const queryClient = useQueryClient();

  const className = cn(
    "group relative flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors duration-200",
    active
      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(10,10,12,0.05)] ring-1 ring-line"
      : disabled
        ? "cursor-not-allowed text-ash"
        : "text-graphite hover:bg-paper/70 hover:text-ink"
  );

  const content = (
    <>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center",
          active ? "text-ink" : "text-ash group-hover:text-ink"
        )}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className={cn("truncate", active ? "font-medium" : "")}>{label}</span>
          {active && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />}
          {soon && (
            <span className="mono-label shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-ash-text">
              Soon
            </span>
          )}
        </span>
      )}
    </>
  );

  if (disabled || !href) {
    return (
      <div className={className} aria-disabled="true" title={soon ? "Coming soon" : undefined}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={className}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => prefetchDashboardTab(queryClient, href)}
      onFocus={() => prefetchDashboardTab(queryClient, href)}
    >
      {content}
    </Link>
  );
}
