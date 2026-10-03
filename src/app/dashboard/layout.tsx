import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell/DashboardShell";
import { getSession } from "@/lib/auth";
import { getDashboardShellData } from "@/lib/db/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/dashboard/overview");
  }

  const shell = await getDashboardShellData(session.userId, session.email);

  return (
    <DashboardShell
      user={shell.user}
      planSummary={shell.planSummary}
      comparisonsNavVisible={shell.comparisonsNavVisible}
      isAgencyUser={shell.isAgencyUser}
    >
      {children}
    </DashboardShell>
  );
}
