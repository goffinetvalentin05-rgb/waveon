import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEAGUE_PLANS, isLeaguePlanId, type LeaguePlanId } from "@/lib/stripe/config";
import { generateInviteCode } from "@/lib/pronoclash/league-utils";
import { grantStarterCards } from "@/lib/pronoclash/league-creation";

export const STRIPE_PRODUCT_TYPE = "private_league_creation" as const;

export type LeagueRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  owner_id: string | null;
  plan: string | null;
  invite_code: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string" ? session.payment_intent : null;
}

/**
 * Active une ligue après paiement Stripe (idempotent).
 * La ligue doit être en `pending_payment` ; si déjà `active`, retourne la ligue.
 */
export async function activateLeagueAfterPayment(
  admin: SupabaseClient,
  leagueId: string,
  session: Stripe.Checkout.Session
): Promise<LeagueRow> {
  const meta = session.metadata ?? {};
  const userId = meta.user_id;
  const planRaw = meta.plan;
  if (!userId || !isLeaguePlanId(planRaw)) {
    throw new Error("Metadata Stripe invalide (user_id / plan).");
  }

  const checkoutSessionId = session.id;
  const paymentIntentId = paymentIntentIdFromSession(session);

  const { data: league } = await admin
    .from("leagues")
    .select(
      "id, slug, name, status, owner_id, plan, invite_code, stripe_checkout_session_id, stripe_payment_intent_id"
    )
    .eq("id", leagueId)
    .maybeSingle();

  if (!league) throw new Error("Ligue introuvable.");
  const row = league as LeagueRow;

  if (row.owner_id !== userId) {
    throw new Error("Owner de la ligue invalide.");
  }

  if (row.status === "active") {
    return row;
  }

  if (row.status !== "pending_payment") {
    throw new Error(`Ligue non activable (status=${row.status}).`);
  }

  if (paymentIntentId) {
    const { data: piUsed } = await admin
      .from("leagues")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .neq("id", leagueId)
      .maybeSingle();
    if (piUsed) throw new Error("payment_intent déjà utilisé pour une autre ligue.");
  }

  const planCfg = LEAGUE_PLANS[planRaw as LeaguePlanId];
  let inviteCode = row.invite_code ?? generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await admin
      .from("leagues")
      .select("id")
      .eq("invite_code", inviteCode)
      .neq("id", leagueId)
      .maybeSingle();
    if (!clash.data) break;
    inviteCode = generateInviteCode();
  }

  const now = new Date().toISOString();
  const amountChf = (session.amount_total ?? 0) / 100;

  const { data: updated, error } = await admin
    .from("leagues")
    .update({
      status: "active",
      plan: planRaw,
      kind: planRaw,
      max_players: planCfg.maxPlayers,
      invite_code: inviteCode,
      paid_at: now,
      amount_chf: amountChf,
      stripe_checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", leagueId)
    .eq("status", "pending_payment")
    .select(
      "id, slug, name, status, owner_id, plan, invite_code, stripe_checkout_session_id, stripe_payment_intent_id"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) {
    const { data: again } = await admin
      .from("leagues")
      .select(
        "id, slug, name, status, owner_id, plan, invite_code, stripe_checkout_session_id, stripe_payment_intent_id"
      )
      .eq("id", leagueId)
      .maybeSingle();
    if (again && (again as LeagueRow).status === "active") return again as LeagueRow;
    throw new Error("Activation ligue échouée.");
  }

  const active = updated as LeagueRow;

  await admin.from("league_members").upsert(
    { league_id: active.id, user_id: userId, role: "owner" },
    { onConflict: "league_id,user_id" }
  );

  await grantStarterCards(admin, userId, active.id);

  return active;
}
