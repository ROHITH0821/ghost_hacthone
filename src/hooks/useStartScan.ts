"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";

/**
 * Sends the visitor to start a scan.
 * Guests go through login first (landing back on the dashboard).
 * Signed-in users go to the dashboard URL input.
 */
export function useStartScan() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return useCallback(() => {
    if (loading) return;

    if (!user) {
      redirectToLogin(router, { redirect: dashboardNewAuditHref() });
      return;
    }

    router.push(dashboardNewAuditHref());
  }, [loading, user, router]);
}
