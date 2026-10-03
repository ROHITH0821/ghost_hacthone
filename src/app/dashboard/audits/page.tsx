import { Suspense } from "react";
import { AuditsPageClient } from "@/components/dashboard/audits/AuditsPageClient";

export default function DashboardAuditsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading audits…</div>}>
      <AuditsPageClient />
    </Suspense>
  );
}
