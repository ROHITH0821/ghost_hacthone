"use client";

import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

export function Ga4ConnectCta({ siteId }: { siteId?: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet/30 bg-gradient-to-r from-violet/10 via-surface/60 to-surface/40 p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet/30 bg-violet/15 text-violet">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold text-ghost-white">
              Connect Google Analytics 4
            </h4>
            <p className="mt-1 text-xs text-muted max-w-xl">
              Back these findings with actual visitor data. See how many users hit each leak, identify high-traffic drop-offs, and prioritize fixes based on real impact.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/sites"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-violet/40 bg-violet/20 px-4 py-2 text-xs font-medium text-ghost-white transition-all hover:border-violet/60 hover:bg-violet/30"
        >
          <span>Connect GA4</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
