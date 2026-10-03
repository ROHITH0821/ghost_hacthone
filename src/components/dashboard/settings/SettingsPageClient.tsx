"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useRouter } from "next/navigation";
import { FileText, Shield, SlidersHorizontal } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { copy } from "@/lib/copy";

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur-sm">
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-midnight/80 text-ghost-white/70">
          {icon}
        </div>
        <p className="font-heading text-lg font-semibold text-ghost-white">{title}</p>
      </header>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/60 bg-midnight/40 p-4">
      <span>
        <span className="block text-sm font-medium text-ghost-white/90">{label}</span>
        <span className="mt-1 block text-xs text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border bg-midnight accent-violet"
      />
    </label>
  );
}

export function SettingsPageClient() {
  const { user } = useDashboard();
  const { logout } = useAuth();
  const router = useRouter();
  const { compactLists, reduceMotion, setPreference } = usePreferences();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.settings}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardSettings.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={copy.dashboardSettings.accountTitle} icon={<Shield className="h-5 w-5" />}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
              <p className="label-caps text-muted">{copy.dashboardSettings.emailLabel}</p>
              <p className="mt-2 text-sm text-ghost-white/90">{user.email}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
              <p className="label-caps text-muted">{copy.dashboardSettings.memberSince}</p>
              <p className="mt-2 text-sm text-ghost-white/90">
                <LocalTime date={user.createdAt} />
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
            >
              {copy.nav.signOut}
            </button>
          </div>
        </Card>

        <Card title={copy.dashboardSettings.preferencesTitle} icon={<SlidersHorizontal className="h-5 w-5" />}>
          <div className="space-y-3">
            <Toggle
              label={copy.dashboardSettings.compactLists}
              description={copy.dashboardSettings.compactListsDesc}
              value={compactLists}
              onChange={value => setPreference("compactLists", value)}
            />
            <Toggle
              label={copy.dashboardSettings.reduceMotion}
              description={copy.dashboardSettings.reduceMotionDesc}
              value={reduceMotion}
              onChange={value => setPreference("reduceMotion", value)}
            />
          </div>
          <p className="mt-4 text-xs text-muted">{copy.dashboardSettings.preferencesNote}</p>
        </Card>

        <Card title={copy.dashboardSettings.exportsTitle} icon={<FileText className="h-5 w-5" />}>
          <p className="text-sm text-muted-light">{copy.dashboardSettings.exportsBody}</p>
        </Card>
      </div>
    </div>
  );
}
