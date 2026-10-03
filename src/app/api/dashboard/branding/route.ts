import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import { getBrandProfileForUser, upsertBrandProfile } from "@/lib/db/brand-profile";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { PRIVATE_SHORT } from "@/lib/http/cache-headers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  if (!(await isAgencyUser(userId))) {
    return NextResponse.json({ error: "Agency subscription required" }, { status: 403 });
  }

  const profile = await getBrandProfileForUser(userId);
  return NextResponse.json(
    { profile },
    { headers: { "Cache-Control": PRIVATE_SHORT } }
  );
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  if (!(await isAgencyUser(userId))) {
    return NextResponse.json({ error: "Agency subscription required" }, { status: 403 });
  }

  const body = await request.json();
  const agencyName = typeof body.agencyName === "string" ? body.agencyName.trim() : "";
  if (!agencyName) {
    return NextResponse.json({ error: "Agency name is required" }, { status: 400 });
  }

  try {
    const profile = await upsertBrandProfile(userId, {
      agencyName,
      logoUrl: body.logoUrl,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      website: body.website,
      accentColor: body.accentColor,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save branding";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
