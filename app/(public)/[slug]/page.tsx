import { createServerSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { Campaign, CampaignObjective, WheelItem } from "@/types/db";
import PublicCampaignClient from "./PublicCampaignClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = slugify(rawSlug ?? "").trim() || (rawSlug ?? "").trim();

  if (!slug) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
        URL invalide.
      </div>
    );
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (campaignError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[public campaign]", campaignError.code, campaignError.message, "slug:", slug);
      }
      return (
        <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
          Erreur lors du chargement de la campagne.
        </div>
      );
    }

    if (!campaign) {
      return (
        <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
          Campagne introuvable.
        </div>
      );
    }

    const objective =
      (campaign.objective as CampaignObjective | null) ??
      (campaign.google_review_url ? "google" : null) ??
      (campaign.instagram_url ? "instagram" : null);

    const targetUrl =
      campaign.target_url ??
      (objective === "google" ? campaign.google_review_url : null) ??
      (objective === "instagram" ? campaign.instagram_url : null) ??
      campaign.link ??
      null;

    const { data: wheel } = await supabase
      .from("wheels")
      .select("id, base_participations")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .maybeSingle();

    let wheelItems: WheelItem[] = [];
    let baseParticipations = 100;
    if (wheel?.id) {
      baseParticipations = wheel.base_participations ?? 100;
      const { data: items } = await supabase
        .from("wheel_items")
        .select("*")
        .eq("wheel_id", wheel.id)
        .order("position");
      wheelItems = (items ?? []) as WheelItem[];
    }

    if (!objective || !targetUrl) {
      return (
        <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
          Campagne incomplète.
        </div>
      );
    }

    return (
      <PublicCampaignClient
        campaign={campaign as Campaign}
        objective={objective}
        targetUrl={targetUrl}
        wheelItems={wheelItems}
        baseParticipations={baseParticipations}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue lors du chargement.";
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
        Erreur Supabase : {message}
      </div>
    );
  }
}

