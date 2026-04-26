import type { SupabaseClient } from "@supabase/supabase-js";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import {
  normalizePublicSlugInput,
  validatePublicSlugFormat,
  PUBLIC_SLUG_MIN_LEN,
} from "@/lib/wavon/public-slug";

/**
 * Si `public_slug` est absent, génère un slug à partir du nom du commerce, vérifie l’unicité, persiste.
 * Utilisé côté dashboard (session propriétaire) — pas sur la page publique.
 */
export async function ensurePublicSlugForBusinessIfEmpty(
  supabase: SupabaseClient,
  business: { id: string; public_slug: string | null; business_name: string | null }
): Promise<string | null> {
  if (business.public_slug?.trim()) {
    return null;
  }
  const raw = normalizePublicSlugInput(business.business_name || "commerce");
  let base = raw.length >= PUBLIC_SLUG_MIN_LEN ? raw : "commerce";
  const validated = validatePublicSlugFormat(base);
  base = validated.ok ? validated.slug : "mon-commerce";

  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base.length > 20 ? base.slice(0, 20) : base}-${n}`;
    const v = validatePublicSlugFormat(candidate);
    if (!v.ok) continue;
    const { data: other } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("public_slug", v.slug)
      .maybeSingle();
    if (other && (other as { id: string }).id !== business.id) {
      continue;
    }
    const { error } = await supabase
      .from(WavonDbTable.businesses)
      .update({ public_slug: v.slug })
      .eq("id", business.id);
    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ensurePublicSlugForBusinessIfEmpty] update error", error.message);
      }
      return null;
    }
    return v.slug;
  }
  return null;
}
