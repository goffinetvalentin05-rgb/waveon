import { supabase } from "@/lib/supabase/client";

const BRANDING_BUCKET = "wavon-branding";

function extFromFile(file: File): string {
  const byName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  const byType = file.type.split("/").pop()?.toLowerCase() ?? "";
  if (byType && /^[a-z0-9+.-]+$/.test(byType)) return byType.replace("+xml", "");
  return "png";
}

export type BrandingAssetKind = "logo" | "cover";

export async function uploadBrandingAsset(input: {
  businessId: string;
  kind: BrandingAssetKind;
  file: File;
}): Promise<{ path: string; publicUrl: string }> {
  const { businessId, kind, file } = input;
  const ext = extFromFile(file);
  const safeKind = kind === "cover" ? "cover" : "logo";
  const path = `businesses/${businessId}/branding/${safeKind}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  return { path, publicUrl };
}

export function getBrandingPublicUrl(path?: string | null): string | null {
  const p = path?.trim();
  if (!p) return null;
  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(p);
  return data.publicUrl || null;
}

export async function deleteBrandingAsset(input: {
  path?: string | null;
}): Promise<void> {
  const path = input.path?.trim();
  if (!path) return;
  const { error } = await supabase.storage.from(BRANDING_BUCKET).remove([path]);
  if (error) throw error;
}

