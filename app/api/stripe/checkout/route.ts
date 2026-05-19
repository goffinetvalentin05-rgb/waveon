import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { requireStripe } from "@/lib/stripe/client";
import {
  LEAGUE_PLANS,
  getStripePriceIdForLeaguePlan,
  isLeaguePlanId,
} from "@/lib/stripe/config";
import { getAppBaseUrl } from "@/lib/brand/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let plan: "private" | "pro";
  let leagueName: string;
  try {
    const body = (await req.json()) as { plan?: unknown; leagueName?: unknown };
    if (!isLeaguePlanId(body.plan)) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }
    plan = body.plan;
    leagueName =
      typeof body.leagueName === "string" ? body.leagueName.trim().slice(0, 60) : "";
    if (!leagueName) {
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
    const stripe = requireStripe();
    const priceId = getStripePriceIdForLeaguePlan(plan);
    const origin = getAppBaseUrl();
    const planCfg = LEAGUE_PLANS[plan];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan,
        league_name: leagueName,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          plan,
          league_name: leagueName,
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${origin}/leagues/new/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/leagues/new?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Session Stripe sans URL." }, { status: 500 });
    }

    // Trace pré-paiement (status pending) pour audit
    await supabase.from("payments").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount_chf: planCfg.priceChf,
      plan,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur inattendue lors de la création du paiement.";
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      {
        error: message.includes("STRIPE_") || message.includes("LEAGUE")
          ? "Configuration Stripe incomplète sur le serveur (clés / price IDs)."
          : message,
      },
      { status: 500 }
    );
  }
}
