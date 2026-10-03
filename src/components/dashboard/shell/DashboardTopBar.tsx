"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { serializeAuditsFilters } from "@/lib/dashboard/filters";
import { useNewAudit } from "../new-audit/NewAuditContext";

export function DashboardTopBar({
  title,
}: {
  title: string;
}) {
  const { openNewAudit } = useNewAudit();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const qs = serializeAuditsFilters({
      search: trimmed,
      status: "",
      auditType: "",
      from: "",
      to: "",
      clientId: "",
    });
    router.push(`/dashboard/audits?${qs}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-midnight/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate font-heading text-base font-medium text-ghost-white md:text-lg">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <form onSubmit={handleSearch} className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.dashboardShell.searchPlaceholder}
              className="h-10 w-56 rounded-xl border border-border/60 bg-surface/40 pl-10 pr-3 text-sm text-ghost-white placeholder:text-muted outline-none transition-colors focus:border-violet/50 focus:ring-1 focus:ring-violet/30"
              aria-label={copy.dashboardShell.searchPlaceholder}
            />
          </form>

          <Button
            aria-label={copy.dashboardShell.newAudit}
            variant="glow"
            size="md"
            onClick={() => openNewAudit()}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.dashboardShell.newAudit}</span>
            <span className="sm:hidden">{copy.dashboardShell.newAuditShort}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
