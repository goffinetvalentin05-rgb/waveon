import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireStripe } from "@/lib/stripe/client";

export const runtime = "nodejs";

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export async function POST() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: business, error: bizErr } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bizErr) {
    console.error("[stripe/portal] lecture business", bizErr);
    return NextResponse.json({ error: "Impossible de charger le commerce." }, { status: 500 });
  }

  const customerId = business?.stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "Aucun client Stripe associé." }, { status: 400 });
  }

  const stripe = requireStripe();
  const origin = baseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/facturation?portal=return`,
  });

  if (!portal.url) {
    return NextResponse.json({ error: "Portail Stripe sans URL." }, { status: 500 });
  }

  return NextResponse.json({ url: portal.url });
}
