import { notFound } from "next/navigation";
import PublicBookingClient from "../reserver/[slug]/PublicBookingClient";
import ProfessionalUnavailable from "./ProfessionalUnavailable";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { resolveMerchantSubscription } from "@/lib/subscription/workspace-access";
import { isReservedPublicSlug } from "@/lib/wavon/public-slug";

type PageProps = { params: Promise<{ slug: string }> };

function publicBookingServerLog(message: string, payload: Record<string, unknown>) {
  if (process.env.PUBLIC_BOOKING_DEBUG === "1") {
    console.log(`[public booking][server] ${message}`, payload);
  }
}

export default async function PublicBookingBySlugPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim().toLowerCase();

  if (!slug || isReservedPublicSlug(slug)) {
    notFound();
  }

  const admin = createAdminSupabaseClient();
  const { data: biz, error: bizError } = await admin
    .from(WavonDbTable.businesses)
    .select("id, user_id")
    .ilike("public_slug", slug)
    .maybeSingle();

  publicBookingServerLog("params", { slug, raw: decodeURIComponent(raw) });

  if (bizError) {
    publicBookingServerLog("business query error", { slug, message: bizError.message, code: bizError.code });
    notFound();
  }

  if (!biz) {
    publicBookingServerLog("no business for slug", { slug });
    notFound();
  }

  const businessId = (biz as { id: string; user_id: string }).id;
  const ownerUserId = (biz as { id: string; user_id: string }).user_id;

  let canUseReservations = false;
  try {
    const { effective } = await resolveMerchantSubscription(businessId, { ownerUserId });
    canUseReservations = effective.canUseReservations;
  } catch (e) {
    publicBookingServerLog("resolveMerchantSubscription error", { businessId, message: String(e) });
    notFound();
  }
  publicBookingServerLog("access", { businessId, canUseReservations });
  if (!canUseReservations) {
    return <ProfessionalUnavailable />;
  }

  return <PublicBookingClient slug={slug} />;
}
