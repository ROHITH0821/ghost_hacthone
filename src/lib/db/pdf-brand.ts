import { isAgencyUser } from "@/lib/db/agency-workspace";
import { getBrandProfileForUser } from "@/lib/db/brand-profile";
import type { PdfBrandOptions } from "@/lib/report/reportPdf";

export async function getPdfBrandForUser(userId: string): Promise<PdfBrandOptions | undefined> {
  const agency = await isAgencyUser(userId);
  if (!agency) return undefined;

  const profile = await getBrandProfileForUser(userId);
  if (!profile) return undefined;

  return {
    agencyName: profile.agencyName,
    logoUrl: profile.logoUrl,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    website: profile.website,
    accentColor: profile.accentColor,
  };
}
