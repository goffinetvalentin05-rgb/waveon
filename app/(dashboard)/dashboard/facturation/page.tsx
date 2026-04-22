import { Suspense } from "react";
import { redirect } from "next/navigation";
import FacturationClient from "./FacturationClient";
import { persistCheckoutSessionSubscription } from "@/lib/stripe/checkout-return";
import { invalidateBusinessSubscriptionCache } from "@/lib/stripe/subscription";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; session_id?: string; portal?: string }>;
}) {
  const sp = await searchParams;

  if (sp.success === "true" && sp.session_id?.trim()) {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await persistCheckoutSessionSubscription(supabase, sp.session_id.trim(), user.id);
    }
    redirect("/dashboard");
  }

  if (sp.portal === "return") {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: biz } = await supabase
        .from(WavonDbTable.businesses)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const bid = (biz as { id: string } | null)?.id;
      if (bid) invalidateBusinessSubscriptionCache(bid);
    }
    redirect("/dashboard/facturation");
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Chargement…</div>}>
      <FacturationClient />
    </Suspense>
  );
}
