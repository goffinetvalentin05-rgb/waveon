import { notFound } from "next/navigation";
import PublicBookingClient from "../reserver/[slug]/PublicBookingClient";
import ProfessionalUnavailable from "./ProfessionalUnavailable";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import { billingAccessStateFromSnapshot } from "@/lib/subscription/billing-access";
import { isReservedPublicSlug } from "@/lib/wavon/public-slug";

type PageProps = { params: Promise<{ slug: string }> };

export default async function PublicBookingBySlugPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim().toLowerCase();

  if (!slug || isReservedPublicSlug(slug)) {
    notFound();
  }

  const admin = createAdminSupabaseClient();
  const { data: biz } = await admin
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!biz) {
    notFound();
  }

  const snapshot = await getBusinessSubscriptionStatus((biz as { id: string }).id);
  if (billingAccessStateFromSnapshot(snapshot) === "BLOCKED") {
    return <ProfessionalUnavailable />;
  }

  return <PublicBookingClient slug={slug} />;
}
