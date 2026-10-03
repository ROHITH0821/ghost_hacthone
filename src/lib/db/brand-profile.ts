import { db } from "@/lib/db";
import { getWorkspaceForUser } from "@/lib/db/agency-workspace";

export type BrandProfileRow = {
  id: string;
  workspaceId: string;
  agencyName: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  accentColor: string | null;
  updatedAt: Date;
};

export type BrandProfileInput = {
  agencyName: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  accentColor?: string | null;
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function validateAccentColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (!HEX_COLOR.test(trimmed)) {
    throw new Error("Accent color must be a valid hex code like #16745F");
  }
  return trimmed.toUpperCase();
}

export async function getBrandProfileForUser(userId: string): Promise<BrandProfileRow | null> {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace?.brandProfile) return null;
  return workspace.brandProfile;
}

export async function getBrandProfileForMissionOwner(userId: string) {
  return getBrandProfileForUser(userId);
}

export async function upsertBrandProfile(userId: string, input: BrandProfileInput) {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) throw new Error("Agency workspace required");

  const accentColor = validateAccentColor(input.accentColor);

  return db.brandProfile.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      agencyName: input.agencyName.trim(),
      logoUrl: input.logoUrl ?? null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      accentColor,
    },
    update: {
      agencyName: input.agencyName.trim(),
      logoUrl: input.logoUrl ?? null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      accentColor,
    },
  });
}
