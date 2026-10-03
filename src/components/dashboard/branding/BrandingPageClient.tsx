"use client";

import { FeedbackState } from "@/components/ui/FeedbackState";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandProfileRow } from "@/lib/db/brand-profile";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

function BrandingForm({
  initialProfile,
  workspaceName,
}: {
  initialProfile: BrandProfileRow | null;
  workspaceName: string;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [agencyName, setAgencyName] = useState(profile?.agencyName ?? workspaceName);
  const [contactEmail, setContactEmail] = useState(profile?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(profile?.contactPhone ?? "");
  const [website, setWebsite] = useState(profile?.website ?? "");
  const [accentColor, setAccentColor] = useState(profile?.accentColor ?? "#16745F");
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName,
          contactEmail,
          contactPhone,
          website,
          accentColor,
          logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setProfile(data.profile);
      setMessage(copy.dashboardBranding.saved);
    } catch {
      setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/dashboard/branding/logo", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setLogoUrl(data.logoUrl);
      setProfile(data.profile);
    } catch {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.branding}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardBranding.subtitle}</p>
      </header>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-border/60 bg-midnight/40 p-6"
      >
        <div className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.logo}</span>
          <div className="mt-2 flex items-center gap-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 max-w-[120px] object-contain" />
            )}
            <label className="relative cursor-pointer rounded-xl focus-within:ring-2 focus-within:ring-violet border border-border px-4 py-2 text-sm text-violet">
              {copy.dashboardBranding.uploadLogo}
              <input type="file" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={copy.dashboardBranding.uploadLogo} onChange={handleLogoUpload} />
            </label>
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.agencyName}</span>
          <input
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.contactEmail}</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.contactPhone}</span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.website}</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-light">{copy.dashboardBranding.accentColor}</span>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-border/60 bg-midnight/40"
          />
        </label>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {message && <p role="status" className="text-sm text-neon-green">{message}</p>}

        <Button type="submit" variant="glow" size="md" isLoading={loading}>
          {copy.dashboardBranding.save}
        </Button>
      </form>
    </div>
  );
}

export function BrandingPageClient() {
  const { isAgencyUser } = useDashboard();
  const router = useRouter();

  useEffect(() => {
    if (!isAgencyUser) router.replace("/dashboard/plan");
  }, [isAgencyUser, router]);

  const { data, isPending, isError, error, refetch } = useDashboardQuery<{
    workspaceName: string;
    profile: BrandProfileRow | null;
  }>({
    queryKey: dashboardKeys.branding(),
    path: "/api/dashboard/branding/bootstrap",
    enabled: isAgencyUser,
  });

  if (!isAgencyUser || isPending) return <DashboardPageLoading />;
  if (isError || !data) return <FeedbackState title="Couldn’t load branding" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;

  return (
    <BrandingForm
      key={data.profile?.id ?? data.workspaceName}
      initialProfile={data.profile}
      workspaceName={data.workspaceName}
    />
  );
}
