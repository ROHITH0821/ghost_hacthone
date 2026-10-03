import { db } from "@/lib/db";

export class MissionAccessError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "forbidden" = "not_found"
  ) {
    super(message);
    this.name = "MissionAccessError";
  }
}

type AccessCacheEntry = {
  ok: boolean;
  code: "not_found" | "forbidden";
  exp: number;
};

/** Short TTL so mission polling doesn't re-query ownership every tick. */
const ACCESS_TTL_MS = 60_000;
const accessCache = new Map<string, AccessCacheEntry>();

function accessCacheKey(missionId: string, userId: string) {
  return `${missionId}:${userId}`;
}

export async function assertMissionAccess(
  missionId: string,
  userId: string
): Promise<void> {
  const key = accessCacheKey(missionId, userId);
  const cached = accessCache.get(key);
  if (cached && cached.exp > Date.now()) {
    if (cached.ok) return;
    throw new MissionAccessError(
      cached.code === "forbidden" ? "Forbidden" : "Mission not found",
      cached.code
    );
  }

  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: {
      userId: true,
      client: {
        select: {
          workspace: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!mission) {
    accessCache.set(key, {
      ok: false,
      code: "not_found",
      exp: Date.now() + ACCESS_TTL_MS,
    });
    throw new MissionAccessError("Mission not found", "not_found");
  }

  if (mission.userId === userId || mission.client?.workspace.ownerId === userId) {
    accessCache.set(key, {
      ok: true,
      code: "not_found",
      exp: Date.now() + ACCESS_TTL_MS,
    });
    return;
  }

  accessCache.set(key, {
    ok: false,
    code: "forbidden",
    exp: Date.now() + ACCESS_TTL_MS,
  });
  throw new MissionAccessError("Forbidden", "forbidden");
}

export async function canAccessMission(
  missionId: string,
  userId: string
): Promise<boolean> {
  try {
    await assertMissionAccess(missionId, userId);
    return true;
  } catch {
    return false;
  }
}
