import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { getWavonDbTablePrefix, WavonDbTable } from "@/lib/supabase/wavon-tables";
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

function logSupabaseErr(step: string, err: unknown) {
  const e = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  console.error(`[stripe/checkout] step=${step} supabase_error`, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  });
}

export async function POST(req: Request) {
  console.log("[stripe/checkout] step=request_received table_prefix=", getWavonDbTablePrefix());
  let plan: BillingPlanId;
  try {
    const body = (await req.json()) as { plan?: unknown };
    if (!isBillingPlanId(body.plan)) {
      console.log("[stripe/checkout] step=parse_body invalid_plan");
      return NextResponse.json({ error: "Plan invalide (starter ou pro)." }, { status: 400 });
    }
    plan = body.plan;
    console.log("[stripe/checkout] step=parse_body ok plan=", plan);
  } catch {
    console.log("[stripe/checkout] step=parse_body json_error");
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  try {
    const supabase = await createRouteHandlerSupabase();
    console.log("[stripe/checkout] step=supabase_client ok");

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.log("[stripe/checkout] step=auth failed", authErr?.message ?? "no_user");
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    console.log("[stripe/checkout] step=auth ok user_id=", user.id);

    const email = user.email?.trim() || undefined;
    if (!email) {
      console.log("[stripe/checkout] step=email missing");
      return NextResponse.json({ error: "Email utilisateur requis pour la facturation." }, { status: 400 });
    }

    const stripe = requireStripe();
    console.log("[stripe/checkout] step=stripe_client ok");

    const business = await ensureBusinessForUser(supabase, user.id);
    console.log("[stripe/checkout] step=ensure_business ok business_id=", business.id);
    console.log(
      "[stripe/checkout] step=supabase_table resolved name=",
      WavonDbTable.businesses,
      "prefix=",
      getWavonDbTablePrefix()
    );

    const priceId = getStripePriceIdForPlan(plan);
    console.log("[stripe/checkout] step=price_id ok (masked length)", priceId.length);

    let customerId = business.stripe_customer_id?.trim() || null;
    if (!customerId) {
      console.log("[stripe/checkout] step=stripe_customer_create start");
      const customer = await stripe.customers.create({
        email,
        metadata: {
          business_id: business.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("[stripe/checkout] step=stripe_customer_create ok customer_id=", customerId);

      console.log(
        "[stripe/checkout] step=supabase_update stripe_customer_id table=",
        WavonDbTable.businesses
      );
      const { error: upErr } = await supabase
        .from(WavonDbTable.businesses)
        .update({ stripe_customer_id: customerId })
        .eq("id", business.id);
      if (upErr) {
        logSupabaseErr("update_stripe_customer_id", upErr);
        return NextResponse.json(
          {
            error:
              "Erreur Supabase lors de l'enregistrement du client Stripe. Vérifie que la migration des colonnes Stripe (stripe_customer_id, etc.) est bien appliquée sur le projet.",
            supabaseCode: upErr.code,
            supabaseMessage: upErr.message,
          },
          { status: 500 }
        );
      }
      console.log("[stripe/checkout] step=supabase_update stripe_customer_id ok");
    } else {
      console.log("[stripe/checkout] step=stripe_customer_reuse customer_id=", customerId);
    }

    const origin = baseUrl();
    console.log("[stripe/checkout] step=checkout_session_create start base_url=", origin);
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
      console.log("[stripe/checkout] step=checkout_session_create missing_url");
      return NextResponse.json({ error: "Session Stripe sans URL." }, { status: 500 });
    }

    console.log(
      "[stripe/checkout] step=done session_id=",
      session.id,
      "ok_supabase_table=",
      WavonDbTable.businesses
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur inattendue lors de la création du paiement.";
    console.error("[stripe/checkout] step=catch fatal", err);
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
