import type { SupabaseClient } from "@supabase/supabase-js";
import { LEAGUE_PLANS, type LeaguePlanId } from "@/lib/stripe/config";
import { generateLeagueSlug } from "@/lib/pronoclash/league-utils";
import { STRIPE_PRODUCT_TYPE, type LeagueRow } from "@/lib/pronoclash/league-activation";

export { STRIPE_PRODUCT_TYPE, type LeagueRow };

/** Crée une ligue en attente de paiement (1 ligue = 1 futur checkout). */
export async function createPendingPrivateLeague(
  admin: SupabaseClient,
  args: { userId: string; plan: LeaguePlanId; name: string }
): Promise<LeagueRow> {
  const planCfg = LEAGUE_PLANS[args.plan];
  let slug = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    slug = generateLeagueSlug();
    const taken = await admin.from("leagues").select("id").eq("slug", slug).maybeSingle();
    if (!taken.data) break;
    slug = "";
  }
  if (!slug) throw new Error("Impossible de générer un slug unique.");

  const { data, error } = await admin
    .from("leagues")
    .insert({
      slug,
      name: args.name.trim().slice(0, 60),
      kind: args.plan,
      owner_id: args.userId,
      plan: args.plan,
      max_players: planCfg.maxPlayers,
      invite_code: null,
      status: "pending_payment",
      settings: { cards_enabled: true, product_type: STRIPE_PRODUCT_TYPE },
    })
    .select(
      "id, slug, name, status, owner_id, plan, invite_code, stripe_checkout_session_id, stripe_payment_intent_id"
    )
    .single();

  if (error || !data) {
    throw new Error(`Échec création ligue pending : ${error?.message ?? "inconnu"}`);
  }
  return data as LeagueRow;
}

export async function attachCheckoutSessionToLeague(
  admin: SupabaseClient,
  args: { leagueId: string; checkoutSessionId: string }
): Promise<void> {
  const { error } = await admin
    .from("leagues")
    .update({ stripe_checkout_session_id: args.checkoutSessionId })
    .eq("id", args.leagueId)
    .eq("status", "pending_payment");
  if (error) throw new Error(error.message);
}

export async function getPendingLeagueForRetry(
  admin: SupabaseClient,
  args: { leagueId: string; userId: string }
): Promise<LeagueRow | null> {
  const { data } = await admin
    .from("leagues")
    .select(
      "id, slug, name, status, owner_id, plan, invite_code, stripe_checkout_session_id, stripe_payment_intent_id"
    )
    .eq("id", args.leagueId)
    .eq("owner_id", args.userId)
    .eq("status", "pending_payment")
    .maybeSingle();
  return (data as LeagueRow | null) ?? null;
}
