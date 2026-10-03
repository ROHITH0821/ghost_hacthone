export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  sites: () => [...dashboardKeys.all, "sites"] as const,
  audits: (query: string) => [...dashboardKeys.all, "audits", query] as const,
  fixes: (query: string) => [...dashboardKeys.all, "fixes", query] as const,
  plan: () => [...dashboardKeys.all, "plan"] as const,
  comparisons: (siteId = "") =>
    [...dashboardKeys.all, "comparisons", siteId] as const,
  clients: () => [...dashboardKeys.all, "clients"] as const,
  branding: () => [...dashboardKeys.all, "branding"] as const,
};
