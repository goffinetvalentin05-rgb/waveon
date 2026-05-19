import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireStripe } from "@/lib/stripe/client";
import {
  LEAGUE_PLANS,
  getStripePriceIdForLeaguePlan,
  isLeaguePlanId,
} from "@/lib/stripe/config";
import { getAppBaseUrl } from "@/lib/brand/config";
import {
  STRIPE_PRODUCT_TYPE,
  attachCheckoutSessionToLeague,
  createPendingPrivateLeague,
  getPendingLeagueForRetry,
} from "@/lib/pronoclash/league-checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let plan: "private" | "pro";
  let leagueName: string;
  let leagueIdRetry: string | null = null;

  try {
    const body = (await req.json()) as {
      plan?: unknown;
      league_name?: unknown;
      league_id?: unknown;
    };
    if (!isLeaguePlanId(body.plan)) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }
    plan = body.plan;
    leagueName =
      typeof body.league_name === "string" ? body.league_name.trim().slice(0, 60) : "";
    if (typeof body.league_id === "string" && body.league_id.trim()) {
      leagueIdRetry = body.league_id.trim();
    }
    if (!leagueIdRetry && !leagueName) {
      return NextResponse.json({ error: "Nom de ligue manquant." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const email = user.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email utilisateur manquant." }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const stripe = requireStripe();
    const priceId = getStripePriceIdForLeaguePlan(plan);
    const origin = getAppBaseUrl();
    const planCfg = LEAGUE_PLANS[plan];

    let league;
    if (leagueIdRetry) {
      const existing = await getPendingLeagueForRetry(admin, {
        leagueId: leagueIdRetry,
        userId: user.id,
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Ligue introuvable ou déjà payée." },
          { status: 404 }
        );
      }
      league = existing;
      leagueName = existing.name;
    } else {
      league = await createPendingPrivateLeague(admin, {
        userId: user.id,
        plan,
        name: leagueName,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        league_id: league.id,
        plan,
        league_name: leagueName,
        product_type: STRIPE_PRODUCT_TYPE,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          league_id: league.id,
          plan,
          league_name: leagueName,
          product_type: STRIPE_PRODUCT_TYPE,
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${origin}/leagues/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/leagues/checkout/cancelled?league_id=${league.id}`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Session Stripe sans URL." }, { status: 500 });
    }

    await attachCheckoutSessionToLeague(admin, {
      leagueId: league.id,
      checkoutSessionId: session.id,
    });

    await admin.from("payments").insert({
      user_id: user.id,
      league_id: league.id,
      stripe_checkout_session_id: session.id,
      amount_chf: planCfg.priceChf,
      plan,
      status: "pending",
    });

    return NextResponse.json({ url: session.url, league_id: league.id });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur inattendue lors de la création du paiement.";
    console.error("[stripe/create-league-checkout]", err);
    return NextResponse.json(
      {
        error:
          message.includes("STRIPE_") || message.includes("LEAGUE")
            ? "Configuration Stripe incomplète sur le serveur (clés / price IDs)."
            : message,
      },
      { status: 500 }
    );
  }
}
