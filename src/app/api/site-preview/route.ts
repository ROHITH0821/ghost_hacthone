import { NextRequest, NextResponse } from "next/server";
import { getMissionStatus } from "@/lib/api/ghost-api";
import { getSession } from "@/lib/auth";
import { assertMissionAccess, MissionAccessError } from "@/lib/auth/mission-access";
import { getMissionPreviewUrl } from "@/lib/db/missions";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { PRIVATE_SHORT } from "@/lib/http/cache-headers";

// Reads persisted preview URL from DB (Node runtime).
export const runtime = "nodejs";

type MicrolinkCache = {
  imageUrl?: string;
  fallback: boolean;
  exp: number;
};

/** One Microlink attempt per mission — avoid hammering on 1.5s client polls. */
const MICROLINK_TTL_MS = 5 * 60_000;
const microlinkCache = new Map<string, MicrolinkCache>();

/**
 * Site preview for the scan animation.
 *
 * Preferred: homepage screenshot uploaded to Supabase during THIS mission's crawl.
 * While the crawl is still running we return { pending: true } so the client keeps polling.
 * Only if the crawl produced no screenshot do we fall back to Microlink, then wireframe.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const missionId = request.nextUrl.searchParams.get("missionId");
  if (!missionId) {
    return NextResponse.json({ error: "missionId required" }, { status: 400 });
  }

  try {
    const userId = await resolveUserIdFromSession(session.userId, session.email);
    await assertMissionAccess(missionId, userId);
  } catch (error) {
    if (error instanceof MissionAccessError) {
      return NextResponse.json(
        { error: "Not found" },
        { status: error.code === "forbidden" ? 403 : 404 }
      );
    }
    throw error;
  }

  const previewUrl = await getMissionPreviewUrl(missionId);
  if (previewUrl) {
    return NextResponse.json(
      { imageUrl: previewUrl, source: "crawl" },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  }

  const mission = await getMissionStatus(missionId);
  if (mission) {
    const crawlInProgress =
      mission.status === "running" &&
      (mission.currentStage === "opening" || mission.currentStage === "understanding");
    if (crawlInProgress) {
      return NextResponse.json({ pending: true });
    }
  }

  const cached = microlinkCache.get(missionId);
  if (cached && cached.exp > Date.now()) {
    return cached.imageUrl
      ? NextResponse.json(
          { imageUrl: cached.imageUrl, source: "microlink" },
          { headers: { "Cache-Control": PRIVATE_SHORT } }
        )
      : NextResponse.json(
          { fallback: true },
          { headers: { "Cache-Control": PRIVATE_SHORT } }
        );
  }

  const fallbackUrl = mission?.url;
  if (!fallbackUrl) {
    microlinkCache.set(missionId, {
      fallback: true,
      exp: Date.now() + MICROLINK_TTL_MS,
    });
    return NextResponse.json(
      { fallback: true },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  }

  const target = fallbackUrl.startsWith("http") ? fallbackUrl : `https://${fallbackUrl}`;
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(target)}&screenshot=true&meta=false`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) {
      microlinkCache.set(missionId, {
        fallback: true,
        exp: Date.now() + MICROLINK_TTL_MS,
      });
      return NextResponse.json(
        { fallback: true },
        { headers: { "Cache-Control": PRIVATE_SHORT } }
      );
    }
    const data = await res.json();
    const imageUrl = data?.data?.screenshot?.url as string | undefined;
    if (imageUrl) {
      microlinkCache.set(missionId, {
        imageUrl,
        fallback: false,
        exp: Date.now() + MICROLINK_TTL_MS,
      });
      return NextResponse.json(
        { imageUrl, source: "microlink" },
        { headers: { "Cache-Control": PRIVATE_SHORT } }
      );
    }
    microlinkCache.set(missionId, {
      fallback: true,
      exp: Date.now() + MICROLINK_TTL_MS,
    });
    return NextResponse.json(
      { fallback: true },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  } catch {
    microlinkCache.set(missionId, {
      fallback: true,
      exp: Date.now() + MICROLINK_TTL_MS,
    });
    return NextResponse.json(
      { fallback: true },
      { headers: { "Cache-Control": PRIVATE_SHORT } }
    );
  }
}
