import { notFound } from "next/navigation";
import { ResultsPageClient } from "@/components/results/ResultsPageClient";
import { getSession } from "@/lib/auth";
import { canAccessMission } from "@/lib/auth/mission-access";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { loadReportPayload } from "@/lib/report/load-report-payload";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const session = await getSession();

  let allowed = false;
  if (session) {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    allowed = await canAccessMission(id, userId);
    if (!allowed) notFound();
  }

  // Render the report in the first response instead of making the browser
  // hydrate, then fetch, then paint. Falls back to the client fetch when the
  // report isn't ready (or the visitor has no session to load it with).
  const initial = allowed ? await loadReportPayload(id) : null;

  return <ResultsPageClient missionId={id} initial={initial} />;
}
