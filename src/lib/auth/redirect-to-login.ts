import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function redirectToLogin(
  router: AppRouterInstance,
  options?: { redirect?: string; url?: string }
) {
  const params = new URLSearchParams({
    redirect: options?.redirect ?? "/dashboard/overview",
  });
  if (options?.url?.trim()) {
    params.set("url", options.url.trim());
  }
  router.push(`/login?${params.toString()}`);
}
