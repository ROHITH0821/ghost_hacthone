"use client";

import { ArrowDown, ArrowUp, Minus, Monitor, Smartphone, Tablet, Users, Activity, Eye, Target } from "lucide-react";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { formatPeriod } from "@/lib/data-sources/ga4/evidence";
import { SectionLabel } from "@/components/ui/BRAVE";

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

function pct(n: number | null): string {
  if (n === null) return "—";
  if (n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

function DeviceIcon({ category }: { category: string }) {
  const cat = category.toLowerCase();
  if (cat === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (cat === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

/**
 * Summary card displaying key GA4 metrics at a glance.
 * Only shows actual, retrieved data — never fabricated numbers.
 */
export function AnalyticsSummaryCard({ evidence }: { evidence: ExternalEvidence }) {
  const { snapshot, activeUserChangePercent } = evidence;
  const m = snapshot.current;
  const period = formatPeriod(snapshot.period);

  const metrics = [
    { label: "Active users", value: fmt(m.activeUsers), icon: Users, change: activeUserChangePercent },
    { label: "Sessions", value: fmt(m.sessions), icon: Activity, change: null },
    { label: "Page views", value: fmt(m.views), icon: Eye, change: null },
    { label: "Engagement rate", value: pct(m.engagementRate), icon: Target, change: null },
  ];

  // Device breakdown.
  const totalDeviceSessions = snapshot.devices.reduce((s, d) => s + (d.sessions ?? 0), 0);
  const deviceBreakdown = totalDeviceSessions > 0
    ? snapshot.devices.map((d) => ({
        category: d.category,
        sessions: d.sessions ?? 0,
        pct: ((d.sessions ?? 0) / totalDeviceSessions * 100).toFixed(0),
      }))
    : [];

  // Top traffic sources.
  const topSources = snapshot.acquisition.slice(0, 5);

  return (
    <section>
      <SectionLabel>Website analytics</SectionLabel>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-xl font-semibold text-ghost-white">
          Traffic <span className="text-gradient">overview</span>
        </h3>
        <span className="text-xs text-muted">{period}</span>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border/60">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted" />
                  <span className="text-xs text-muted">{metric.label}</span>
                </div>
                <p className="font-heading text-xl font-semibold text-ghost-white tabular-nums">
                  {metric.value}
                </p>
                {metric.change !== null && (
                  <p
                    className={`mt-1 flex items-center gap-0.5 text-xs ${
                      metric.change > 0 ? "text-neon-green" : metric.change < 0 ? "text-danger" : "text-muted"
                    }`}
                  >
                    {metric.change > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : metric.change < 0 ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change)}% vs previous period
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Device + Source breakdown */}
        {(deviceBreakdown.length > 0 || topSources.length > 0) && (
          <div className="grid sm:grid-cols-2 divide-x divide-border/60 border-t border-border/60">
            {deviceBreakdown.length > 0 && (
              <div className="p-4">
                <p className="label-caps mb-2">Devices</p>
                <div className="space-y-1.5">
                  {deviceBreakdown.map((d) => (
                    <div key={d.category} className="flex items-center gap-2 text-sm">
                      <DeviceIcon category={d.category} />
                      <span className="flex-1 text-muted-light capitalize">{d.category}</span>
                      <span className="tabular-nums text-ghost-white/80">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topSources.length > 0 && (
              <div className="p-4">
                <p className="label-caps mb-2">Top sources</p>
                <div className="space-y-1.5">
                  {topSources.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-muted-light truncate">
                        {s.source === "(direct)" ? "Direct" : s.source}
                        {s.medium !== "(none)" && s.medium !== "(not set)" && (
                          <span className="text-muted"> / {s.medium}</span>
                        )}
                      </span>
                      <span className="tabular-nums text-ghost-white/80">{fmt(s.sessions)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes / caveats */}
        {snapshot.notes.length > 0 && (
          <div className="border-t border-border/60 px-4 py-3">
            {snapshot.notes.map((note, i) => (
              <p key={i} className="text-xs text-muted leading-relaxed">
                {note}
              </p>
            ))}
          </div>
        )}

        <div className="border-t border-border/60 px-4 py-2">
          <p className="text-[10px] text-muted">
            Source: Google Analytics 4 · {snapshot.propertyName} · Synced{" "}
            {new Date(snapshot.syncedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
}
