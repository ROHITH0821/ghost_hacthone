import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceForUser, isAgencyUser } from "@/lib/db/agency-workspace";
import { upsertBrandProfile } from "@/lib/db/brand-profile";
import { resolveUserIdFromSession } from "@/lib/db/users";
import { uploadAgencyLogo } from "@/lib/storage/supabase";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await resolveUserIdFromSession(session.userId, session.email);
  if (!(await isAgencyUser(userId))) {
    return NextResponse.json({ error: "Agency subscription required" }, { status: 403 });
  }

  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Logo must be PNG, JPEG, WebP, or SVG" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo must be under 2MB" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1] ?? "png";

  try {
    const uploaded = await uploadAgencyLogo({
      workspaceId: workspace.id,
      fileBytes: bytes,
      contentType: file.type,
      extension: ext,
    });

    const existingName = workspace.brandProfile?.agencyName ?? workspace.name;
    const profile = await upsertBrandProfile(userId, {
      agencyName: existingName,
      logoUrl: uploaded.publicUrl,
      contactEmail: workspace.brandProfile?.contactEmail,
      contactPhone: workspace.brandProfile?.contactPhone,
      website: workspace.brandProfile?.website,
      accentColor: workspace.brandProfile?.accentColor,
    });

    return NextResponse.json({ profile, logoUrl: uploaded.publicUrl });
  } catch (error) {
    console.error("[branding/logo]", error);
    return NextResponse.json({ error: "Logo upload failed" }, { status: 500 });
  }
}
