import type { SupabaseClient } from "@supabase/supabase-js";

type BusinessRow = {
  id: string;
  stripe_customer_id: string | null;
};

const selectCols = "id,stripe_customer_id";

/**
 * Retourne le business du user, ou en crée un (slug provisoire) comme dans WavonProvider.
 */
export async function ensureBusinessForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessRow> {
  const { data: existing, error: selErr } = await supabase
    .from("wavon_businesses")
    .select(selectCols)
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as BusinessRow;

  const provisionalSlug = `c-${crypto.randomUUID().replace(/-/g, "").slice(0, 11)}`;
  const { data: created, error: insErr } = await supabase
    .from("wavon_businesses")
    .insert({ user_id: userId, public_slug: provisionalSlug })
    .select(selectCols)
    .single();
  if (insErr) throw insErr;
  return created as BusinessRow;
}
