import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireStripe } from "@/lib/stripe/client";
import {
  clearSubscriptionCanceled,
  findBusinessIdByStripeCustomer,
  findBusinessIdByStripeSubscription,
  markPastDueByCustomerId,
  syncBusinessFromStripeSubscription,
} from "@/lib/stripe/db-sync";
import { subscriptionIdFromInvoice } from "@/lib/stripe/invoice-helpers";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";

export const runtime = "nodejs";

/**
 * Webhook Stripe — corps brut requis pour la signature.
 * En cas d'erreur métier après vérification, on répond quand même 200 (retry infini sinon).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Configuration webhook absente." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = requireStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature invalide", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const stripe = requireStripe();

  try {
    const admin = createAdminSupabaseClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId =
          session.metadata?.business_id?.trim() ||
          session.client_reference_id?.trim() ||
          null;
        const subRef = session.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (session.mode === "subscription" && subId && businessId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncBusinessFromStripeSubscription(admin, businessId, sub);
          console.log(
            `[stripe/webhook] checkout.session.completed business_id=${businessId} subscription=${sub.id}`
          );
        } else {
          console.warn("[stripe/webhook] checkout.session.completed — données incomplètes", {
            mode: session.mode,
            subId,
            businessId,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let businessId = sub.metadata?.business_id?.trim() || null;
        if (!businessId) {
          businessId = await findBusinessIdByStripeSubscription(admin, sub.id);
        }
        if (!businessId) {
          const cust =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (cust) businessId = await findBusinessIdByStripeCustomer(admin, cust);
        }
        if (businessId) {
          await syncBusinessFromStripeSubscription(admin, businessId, sub);
          console.log(
            `[stripe/webhook] customer.subscription.updated business_id=${businessId} subscription=${sub.id}`
          );
        } else {
          console.warn("[stripe/webhook] customer.subscription.updated — business introuvable", {
            subscription: sub.id,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const businessId =
          (await findBusinessIdByStripeSubscription(admin, sub.id)) ??
          sub.metadata?.business_id?.trim() ??
          "—";
        await clearSubscriptionCanceled(admin, sub.id);
        console.log(
          `[stripe/webhook] customer.subscription.deleted business_id=${businessId} subscription=${sub.id}`
        );
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = subscriptionIdFromInvoice(inv);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          let businessId = sub.metadata?.business_id?.trim() || null;
          if (!businessId) {
            businessId = await findBusinessIdByStripeSubscription(admin, sub.id);
          }
          if (!businessId) {
            const cust = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
            if (cust) businessId = await findBusinessIdByStripeCustomer(admin, cust);
          }
          if (businessId) {
            await syncBusinessFromStripeSubscription(admin, businessId, sub);
            if (inv.period_end) {
              await admin
                .from(WavonDbTable.businesses)
                .update({ current_period_end: new Date(inv.period_end * 1000).toISOString() })
                .eq("id", businessId);
            }
            console.log(
              `[stripe/webhook] invoice.payment_succeeded business_id=${businessId} invoice=${inv.id} period_end=${inv.period_end}`
            );
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          await markPastDueByCustomerId(admin, customerId);
          const businessId = await findBusinessIdByStripeCustomer(admin, customerId);
          console.log(
            `[stripe/webhook] invoice.payment_failed business_id=${businessId ?? "—"} customer=${customerId}`
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] erreur traitement ${event.type}`, err);
  }

  return NextResponse.json({ received: true });
}
