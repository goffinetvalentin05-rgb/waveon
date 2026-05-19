import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/stripe/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isLeaguePlanId } from "@/lib/stripe/config";
import { createPrivateLeagueAfterPayment } from "@/lib/pronoclash/league-creation";
import { sendLeagueCreatedEmail } from "@/lib/emails/send";
import { getAppBaseUrl } from "@/lib/brand/config";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "payment") break;
        if (session.payment_status !== "paid") break;

        const meta = session.metadata ?? {};
        const userId = meta.user_id;
        const planRaw = meta.plan;
        const leagueName = meta.league_name?.trim() || "Ma ligue Prono Clash";
        if (!userId || !isLeaguePlanId(planRaw)) {
          console.warn("[stripe/webhook] metadata invalide", meta);
          break;
        }

        const admin = createAdminSupabaseClient();
        const amount = (session.amount_total ?? 0) / 100;

        const league = await createPrivateLeagueAfterPayment(admin, {
          userId,
          plan: planRaw,
          name: leagueName,
          stripeSessionId: session.id,
          amountChf: amount,
        });

        // Marquer le paiement comme payé
        await admin
          .from("payments")
          .update({
            status: "paid",
            league_id: league.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            raw: session as unknown as Record<string, unknown>,
          })
          .eq("stripe_session_id", session.id);

        // Email best-effort : "ligue créée"
        const ownerEmail = session.customer_details?.email ?? session.customer_email ?? null;
        if (ownerEmail) {
          const { data: ownerProfile } = await admin
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .maybeSingle();
          const { data: leagueFull } = await admin
            .from("leagues")
            .select("invite_code, name, slug")
            .eq("id", league.id)
            .maybeSingle();
          const baseUrl = getAppBaseUrl();
          const inviteUrl = leagueFull?.invite_code
            ? `${baseUrl}/leagues/join/${leagueFull.invite_code}`
            : `${baseUrl}/leagues/${league.slug}`;
          void sendLeagueCreatedEmail({
            to: ownerEmail,
            username: ownerProfile?.username ?? "Joueur",
            leagueName: leagueFull?.name ?? leagueName,
            inviteUrl,
            leagueUrl: `${baseUrl}/leagues/${league.slug}`,
          }).catch(() => undefined);
        }
        break;
      }
      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as { id?: string };
        const admin = createAdminSupabaseClient();
        const sid = (event.data.object as Stripe.Checkout.Session).id ?? obj.id;
        if (sid) {
          await admin
            .from("payments")
            .update({ status: "failed" })
            .eq("stripe_session_id", sid);
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
