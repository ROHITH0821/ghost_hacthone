import { OverviewPageClient } from "@/components/dashboard/overview/OverviewPageClient";

/** Thin route: page data loads via React Query (cached across tab switches). */
export default function DashboardOverviewPage() {
  return <OverviewPageClient />;
}
