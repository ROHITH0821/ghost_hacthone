"use client";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

/** Bearer links must never be included in analytics page URLs. */
export function PrivacyAwareAnalytics() {
  const pathname = usePathname();
  if (pathname?.startsWith("/share/fixes/")) return null;
  return <Analytics beforeSend={event => new URL(event.url).pathname.startsWith("/share/fixes/") ? null : event} />;
}
