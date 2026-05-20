import type { SupabaseClient } from "@supabase/supabase-js";
import { V1_STARTER_PACK } from "@/lib/pronoclash/card-messages";

/**
 * Pack de départ V1 : 5 cartes fixes, une seule fois par joueur et par ligue privée.
 * Idempotent : ne fait rien si l'inventaire existe déjà (même à quantité 0).
 */
export async function grantStarterCards(
  admin: SupabaseClient,
  userId: string,
  leagueId: string
): Promise<void> {
  const { count, error: countErr } = await admin
    .from("card_inventory")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("league_id", leagueId);

  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return;

  const rows = Object.entries(V1_STARTER_PACK).map(([card_id, quantity]) => ({
    user_id: userId,
    league_id: leagueId,
    card_id,
    quantity,
  }));

  const { error } = await admin.from("card_inventory").insert(rows);
  if (error) throw new Error(error.message);
}
