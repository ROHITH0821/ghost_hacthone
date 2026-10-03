import { Suspense } from "react";
import { FixesPageClient } from "@/components/dashboard/fixes/FixesPageClient";

export default function DashboardFixesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading fixes…</div>}>
      <FixesPageClient />
    </Suspense>
  );
}
