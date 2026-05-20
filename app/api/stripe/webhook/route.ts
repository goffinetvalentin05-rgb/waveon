import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/stripe/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isLeaguePlanId } from "@/lib/stripe/config";
import {
  STRIPE_PRODUCT_TYPE,
  activateLeagueAfterPayment,
} from "@/lib/pronoclash/league-activation";
import { sendLeagueCreatedEmail } from "@/lib/emails/send";
import { brand, getAppBaseUrl } from "@/lib/brand/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn("[stripe/webhook] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 501 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = requireStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "payment") break;
        if (session.payment_status !== "paid") break;

        const meta = session.metadata ?? {};
        if (meta.product_type !== STRIPE_PRODUCT_TYPE) break;

        const userId = meta.user_id;
        const leagueId = meta.league_id;
        const planRaw = meta.plan;
        const leagueName = meta.league_name?.trim() || `Ma ligue ${brand.name}`;

        if (!userId || !leagueId || !isLeaguePlanId(planRaw)) {
          console.warn("[stripe/webhook] metadata invalide", meta);
          break;
        }

        const { data: existingLeague } = await admin
          .from("leagues")
          .select("id, slug, status")
          .eq("id", leagueId)
          .maybeSingle();

        if (!existingLeague) {
          console.warn("[stripe/webhook] ligue introuvable", leagueId);
          break;
        }

        if (existingLeague.status === "active") {
          break;
        }

        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
        if (paymentIntentId) {
          const { data: piUsed } = await admin
            .from("leagues")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .neq("id", leagueId)
            .maybeSingle();
          if (piUsed) {
            console.error("[stripe/webhook] payment_intent déjà utilisé", paymentIntentId);
            return NextResponse.json({ error: "payment_intent dupliqué." }, { status: 409 });
          }
        }

        const league = await activateLeagueAfterPayment(admin, leagueId, session);

        await admin
          .from("payments")
          .update({
            status: "paid",
            league_id: league.id,
            stripe_payment_intent_id: paymentIntentId,
            raw_event: session as unknown as Record<string, unknown>,
          })
          .eq("stripe_checkout_session_id", session.id);

        const ownerEmail = session.customer_details?.email ?? session.customer_email ?? null;
        if (ownerEmail) {
          const { data: ownerProfile } = await admin
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .maybeSingle();
          const baseUrl = getAppBaseUrl();
          const inviteUrl = league.invite_code
            ? `${baseUrl}/leagues/join/${league.invite_code}`
            : `${baseUrl}/leagues/${league.slug}`;
          void sendLeagueCreatedEmail({
            to: ownerEmail,
            username: ownerProfile?.username ?? "Joueur",
            leagueName: league.name ?? leagueName,
            inviteUrl,
            leagueUrl: `${baseUrl}/leagues/${league.slug}`,
          }).catch(() => undefined);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.id) {
          await admin
            .from("payments")
            .update({ status: "failed" })
            .eq("stripe_checkout_session_id", session.id);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.id) {
          await admin
            .from("payments")
            .update({ status: "failed" })
            .eq("stripe_payment_intent_id", pi.id);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook] handler", e);
    return NextResponse.json({ error: "Erreur traitement webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
