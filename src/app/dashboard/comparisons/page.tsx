import { Suspense } from "react";
import { ComparisonsPageClient } from "@/components/dashboard/comparisons/ComparisonsPageClient";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

export default function DashboardComparisonsPage() {
  return (
    <Suspense fallback={<DashboardPageLoading />}>
      <ComparisonsPageClient />
    </Suspense>
  );
}
