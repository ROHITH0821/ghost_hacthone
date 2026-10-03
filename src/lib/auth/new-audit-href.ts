/** Dashboard path that opens the New Audit modal (optional prefilled URL). */
export function dashboardNewAuditHref(url?: string): string {
  const params = new URLSearchParams({ newAudit: "1" });
  const trimmed = url?.trim();
  if (trimmed) params.set("url", trimmed);
  return `/dashboard/overview?${params.toString()}`;
}

/** Comparisons page for a specific site (siteId or domain). */
export function dashboardComparisonsHref(siteKey?: string | null): string {
  const trimmed = siteKey?.trim();
  if (!trimmed) return "/dashboard/comparisons";
  return `/dashboard/comparisons?siteId=${encodeURIComponent(trimmed)}`;
}
