import { notFound } from "next/navigation";
import { MissionPageClient } from "@/components/mission/MissionPageClient";
import { getSession } from "@/lib/auth";
import { canAccessMission } from "@/lib/auth/mission-access";
import { resolveUserIdFromSession } from "@/lib/db/users";

interface MissionPageProps {
  params: Promise<{ id: string }>;
}

export default async function MissionPage({ params }: MissionPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    const allowed = await canAccessMission(id, userId);
    if (!allowed) notFound();
  }

  return <MissionPageClient missionId={id} />;
}
