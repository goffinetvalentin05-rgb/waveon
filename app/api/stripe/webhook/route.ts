import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import {
  applyStripeSubscriptionDeleted,
  resolveBusinessIdFromStripeSubscription,
  syncStripeSubscriptionToBusinessRow,
} from "@/lib/stripe/business-subscription-sync";
import { requireStripe } from "@/lib/stripe/client";

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
        if (session.mode === "subscription") {
          const subRef = session.subscription;
          const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
          if (subscriptionId) {
            const stripe = requireStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            const bid =
              session.metadata?.business_id?.trim() || (await resolveBusinessIdFromStripeSubscription(sub));
            if (bid) await syncStripeSubscriptionToBusinessRow(bid, sub);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const bid = await resolveBusinessIdFromStripeSubscription(sub);
        if (bid) await syncStripeSubscriptionToBusinessRow(bid, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const bid = await resolveBusinessIdFromStripeSubscription(sub);
        if (bid) await applyStripeSubscriptionDeleted(bid);
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
