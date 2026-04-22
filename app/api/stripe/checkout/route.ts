import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { requireStripe } from "@/lib/stripe/client";
import {
  getStripePriceIdForPlan,
  isBillingPlanId,
  TRIAL_PERIOD_DAYS,
  type BillingPlanId,
} from "@/lib/stripe/config";
import { ensureBusinessForUser } from "@/lib/wavon/ensure-business-for-user";

export const runtime = "nodejs";

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export async function POST(req: Request) {
  let plan: BillingPlanId;
  try {
    const body = (await req.json()) as { plan?: unknown };
    if (!isBillingPlanId(body.plan)) {
      return NextResponse.json({ error: "Plan invalide (starter ou pro)." }, { status: 400 });
    }
    plan = body.plan;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const email = user.email?.trim() || undefined;
    if (!email) {
      return NextResponse.json({ error: "Email utilisateur requis pour la facturation." }, { status: 400 });
    }

    const stripe = requireStripe();
    const business = await ensureBusinessForUser(supabase, user.id);
    const priceId = getStripePriceIdForPlan(plan);

    let customerId = business.stripe_customer_id?.trim() || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          business_id: business.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      const { error: upErr } = await supabase
        .from("wavon_businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", business.id);
      if (upErr) {
        console.error("[stripe/checkout] impossible d'enregistrer stripe_customer_id", upErr);
        return NextResponse.json({ error: "Erreur lors de l'enregistrement du client Stripe." }, { status: 500 });
      }
    }

    const origin = baseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: business.id,
      metadata: {
        business_id: business.id,
        user_id: user.id,
        plan,
      },
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          business_id: business.id,
          user_id: user.id,
          plan,
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${origin}/dashboard/facturation?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Session Stripe sans URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur inattendue lors de la création du paiement.";
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      {
        error:
          message.includes("STRIPE_SECRET_KEY") || message.includes("STRIPE_PRICE_ID")
            ? "Configuration Stripe incomplète sur le serveur (clés ou price IDs). Vérifie les variables d’environnement."
            : message,
      },
      { status: 500 }
    );
  }
}
