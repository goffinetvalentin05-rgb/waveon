import type { SupabaseClient } from "@supabase/supabase-js";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";

type BusinessRow = {
  id: string;
  stripe_customer_id: string | null;
};

const selectCols = "id,stripe_customer_id";

/**
 * Retourne le business du user, ou en crée un (slug provisoire) comme dans WavonProvider.
 * Table : {@link WavonDbTable.businesses} — toujours `wavon_businesses` pour ce projet.
 */
export async function ensureBusinessForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessRow> {
  console.log("[ensureBusinessForUser] select table=", WavonDbTable.businesses, "user_id=", userId);
  const { data: existing, error: selErr } = await supabase
    .from(WavonDbTable.businesses)
    .select(selectCols)
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) {
    console.error("[ensureBusinessForUser] select error", {
      code: selErr.code,
      message: selErr.message,
      details: selErr.details,
    });
    throw new Error(
      `Supabase ${WavonDbTable.businesses} (select): ${selErr.message}${selErr.code ? ` [${selErr.code}]` : ""}`
    );
  }
  if (existing) {
    console.log("[ensureBusinessForUser] found business_id=", (existing as BusinessRow).id);
    return existing as BusinessRow;
  }

  const provisionalSlug = `c-${crypto.randomUUID().replace(/-/g, "").slice(0, 11)}`;
  console.log("[ensureBusinessForUser] insert new business slug=", provisionalSlug);
  const { data: created, error: insErr } = await supabase
    .from(WavonDbTable.businesses)
    .insert({ user_id: userId, public_slug: provisionalSlug })
    .select(selectCols)
    .single();
  if (insErr) {
    console.error("[ensureBusinessForUser] insert error", {
      code: insErr.code,
      message: insErr.message,
      details: insErr.details,
    });
    throw new Error(
      `Supabase ${WavonDbTable.businesses} (insert): ${insErr.message}${insErr.code ? ` [${insErr.code}]` : ""}`
    );
  }
  console.log("[ensureBusinessForUser] created business_id=", (created as BusinessRow).id);
  return created as BusinessRow;
}
