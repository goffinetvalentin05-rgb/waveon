import type { SupabaseClient } from "@supabase/supabase-js";
import { LEAGUE_PLANS, type LeaguePlanId } from "@/lib/stripe/config";
import { generateInviteCode, generateLeagueSlug } from "@/lib/pronoclash/league-utils";

/**
 * Crée une ligue privée payante après paiement Stripe réussi.
 * Utilise un client admin (service role) pour pouvoir bypass RLS.
 *
 * Idempotent : si une ligue avec stripe_session_id donné existe déjà,
 * elle est retournée telle quelle.
 */
export async function createPrivateLeagueAfterPayment(
  admin: SupabaseClient,
  args: {
    userId: string;
    plan: LeaguePlanId;
    name: string;
    stripeSessionId: string;
    amountChf: number;
  }
): Promise<{ id: string; slug: string }> {
  const existing = await admin
    .from("leagues")
    .select("id, slug")
    .eq("stripe_session_id", args.stripeSessionId)
    .maybeSingle();
  if (existing.data) return existing.data as { id: string; slug: string };

  const planCfg = LEAGUE_PLANS[args.plan];

  let slug = "";
  let inviteCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    slug = generateLeagueSlug();
    inviteCode = generateInviteCode();
    const taken = await admin.from("leagues").select("id").eq("slug", slug).maybeSingle();
    if (!taken.data) break;
    slug = "";
  }
  if (!slug) {
    throw new Error("Impossible de générer un slug unique pour la ligue.");
  }

  const insertRes = await admin
    .from("leagues")
    .insert({
      slug,
      name: args.name,
      kind: args.plan,
      owner_id: args.userId,
      plan: args.plan,
      max_players: planCfg.maxPlayers,
      invite_code: inviteCode,
      status: "active",
      paid_at: new Date().toISOString(),
      stripe_session_id: args.stripeSessionId,
      amount_chf: args.amountChf,
      settings: { cards_enabled: true },
    })
    .select("id, slug")
    .single();

  if (insertRes.error || !insertRes.data) {
    throw new Error(`Échec insertion ligue : ${insertRes.error?.message ?? "inconnu"}`);
  }
  const league = insertRes.data;

  // Inscrire l'owner comme membre
  await admin
    .from("league_members")
    .upsert(
      {
        league_id: league.id,
        user_id: args.userId,
        role: "owner",
      },
      { onConflict: "league_id,user_id" }
    );

  // Distribuer 5 cartes "Joker x2" aux nouveaux membres ? On laisse la
  // distribution se faire à l'inscription d'un joueur (cf. join API).
  // L'owner reçoit son lot dès maintenant.
  await grantStarterCards(admin, args.userId, league.id);

  return league;
}

/** Donne le pack de cartes de départ à un joueur qui rejoint une ligue privée. */
export async function grantStarterCards(
  admin: SupabaseClient,
  userId: string,
  leagueId: string
): Promise<void> {
  // 5 cartes au total, panachées
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
