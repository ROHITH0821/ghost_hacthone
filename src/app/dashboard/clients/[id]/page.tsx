import { ClientDetailPageClient } from "@/components/dashboard/clients/ClientDetailPageClient";
import { getClientForUser } from "@/lib/db/clients";
import { getDashboardShellData } from "@/lib/db/dashboard-shell";
import { getFixesForUser } from "@/lib/db/fix-status";
import { getAuditsForUser } from "@/lib/db/missions";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const shell = await getDashboardShellData(session.userId, session.email);
  if (!shell.isAgencyUser) redirect("/dashboard/plan");

  const { id } = await params;
  const client = await getClientForUser(shell.user.id, id);
  if (!client) notFound();

  const [audits, fixes] = await Promise.all([
    getAuditsForUser({ userId: shell.user.id, clientId: id }),
    client.siteId
      ? getFixesForUser({ userId: shell.user.id, siteId: client.siteId })
      : getFixesForUser({ userId: shell.user.id }),
  ]);

  const scopedFixes = client.siteId
    ? fixes.filter((f) => f.siteId === client.siteId)
    : fixes;

  return (
    <ClientDetailPageClient client={client} audits={audits} fixes={scopedFixes} />
  );
}
