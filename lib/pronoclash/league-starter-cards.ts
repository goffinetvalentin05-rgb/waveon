import type { SupabaseClient } from "@supabase/supabase-js";

/** Donne le pack de cartes de départ à un joueur qui rejoint une ligue privée. */
export async function grantStarterCards(
  admin: SupabaseClient,
  userId: string,
  leagueId: string
): Promise<void> {
  const starterPack: Record<string, number> = {
    joker_x2: 2,
    vol_score: 1,
    carton_rouge: 1,
    tacle_glisse: 1,
  };
  for (const [cardId, quantity] of Object.entries(starterPack)) {
    await admin.from("card_inventory").upsert(
      {
        user_id: userId,
        league_id: leagueId,
        card_id: cardId,
        quantity,
      },
      { onConflict: "user_id,league_id,card_id" }
    );
  }
}
