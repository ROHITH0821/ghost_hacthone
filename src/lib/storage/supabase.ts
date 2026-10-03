import { createClient } from "@supabase/supabase-js";

export type UploadedPdf = {
  bucket: string;
  path: string;
  publicUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[storage] Missing env var: ${name}`);
  return value;
}

function getBucket(): string {
  return process.env.SUPABASE_PDF_BUCKET ?? "ghost-reports";
}

function getSupabaseAdminClient() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function uploadMissionPdf(input: {
  missionId: string;
  domain: string;
  pdfBytes: Uint8Array;
}): Promise<UploadedPdf> {
  const supabase = getSupabaseAdminClient();
  const bucket = getBucket();
  const domain = safeSlug(input.domain) || "site";
  const path = `reports/${domain}/${input.missionId}/ghost-report.pdf`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(`[storage] PDF upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error("[storage] Missing public URL after upload");

  return { bucket, path, publicUrl };
}

export async function uploadMissionPreview(input: {
  missionId: string;
  domain: string;
  pngBytes: Uint8Array;
}): Promise<UploadedPdf> {
  const supabase = getSupabaseAdminClient();
  const bucket = getBucket();
  const domain = safeSlug(input.domain) || "site";
  const path = `reports/${domain}/${input.missionId}/preview.png`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.pngBytes, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(`[storage] Preview upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error("[storage] Missing public URL after preview upload");

  return { bucket, path, publicUrl };
}

export async function uploadAgencyLogo(input: {
  workspaceId: string;
  fileBytes: Uint8Array;
  contentType: string;
  extension: string;
}): Promise<{ publicUrl: string }> {
  const supabase = getSupabaseAdminClient();
  const bucket = getBucket();
  const ext = safeSlug(input.extension.replace(".", "")) || "png";
  const path = `branding/${input.workspaceId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.fileBytes, {
    contentType: input.contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(`[storage] Logo upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error("[storage] Missing public URL after logo upload");

  return { publicUrl };
}

