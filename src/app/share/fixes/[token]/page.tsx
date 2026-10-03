import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedFix } from "@/lib/db/fix-shares";
import { SharedFixView } from "@/components/fixes/SharedFixView";
import { GhostLogo } from "@/components/ui/GhostLogo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer handoff — Ghost", description: "A shared website improvement handoff.",
  robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer",
};
export default async function SharedFixPage({ params }: { params: Promise<{ token: string }> }) {
  const data = await getSharedFix((await params).token);
  if (!data) notFound();
  return <main id="main-content" className="section-pad min-h-screen py-8 sm:py-12"><div className="mx-auto mb-10 max-w-3xl"><GhostLogo size="sm" /></div><SharedFixView snapshot={data.snapshot} expiresAt={data.expiresAt} /></main>;
}
