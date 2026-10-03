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
    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
    active
      ? "bg-violet/10 text-violet"
      : disabled
        ? "cursor-not-allowed text-muted/60"
        : "text-muted-light hover:bg-surface/50 hover:text-ghost-white"
  );

  const content = (
    <>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center",
          active && "text-violet"
        )}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate font-medium">{label}</span>
          {soon && (
            <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
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
