"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Campaign, Reward } from "@/types/db";

type PageProps = {
  params: { slug: string };
};

export default function PublicCampaignPage({ params }: PageProps) {
  const supabaseClient = supabase;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewClicked, setReviewClicked] = useState(false);
  const [followClicked, setFollowClicked] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const visitedRef = useRef(false);

  const isUnlocked = reviewClicked && followClicked;

  useEffect(() => {
    const loadCampaign = async () => {
      if (!supabaseClient) {
        setError("Supabase n’est pas encore configuré.");
        setLoading(false);
        return;
      }
      const { data: campaignData, error: campaignError } = await supabaseClient
        .from("campaigns")
        .select("*")
        .eq("slug", params.slug)
        .single();

      if (campaignError || !campaignData) {
        setError("Campagne introuvable.");
        setLoading(false);
        return;
      }

      const { data: rewardsData } = await supabaseClient
        .from("rewards")
        .select("*")
        .eq("campaign_id", campaignData.id)
        .order("created_at", { ascending: true });

      setCampaign(campaignData as Campaign);
      setRewards((rewardsData ?? []) as Reward[]);
      setLoading(false);
    };

    loadCampaign();
  }, [params.slug, supabaseClient]);

  useEffect(() => {
    if (!campaign || visitedRef.current || !supabaseClient) return;
    visitedRef.current = true;
    void supabaseClient.from("participations").insert({
      campaign_id: campaign.id,
      event_type: "visit",
    });
  }, [campaign, supabaseClient]);

  const handleAction = (type: "review" | "follow") => {
    if (!campaign) return;
    if (type === "review") {
      window.open(campaign.google_review_url, "_blank");
      setReviewClicked(true);
      return;
    }
    window.open(campaign.instagram_url, "_blank");
    setFollowClicked(true);
  };

  const handlePlay = async () => {
    if (!campaign || spinning || result || !supabaseClient) return;
    setSpinning(true);

    const ratio = Math.max(1, campaign.win_ratio ?? 10);
    const isWin = Math.floor(Math.random() * ratio) === 0;
    const prize =
      isWin && rewards.length
        ? rewards[Math.floor(Math.random() * rewards.length)].label
        : isWin
          ? "Récompense surprise"
          : "Perdu";

    setTimeout(async () => {
      setSpinning(false);
      setResult(prize);
      await supabaseClient.from("participations").insert({
        campaign_id: campaign.id,
        event_type: "play",
        did_review: reviewClicked,
        did_follow: followClicked,
        result: isWin ? "win" : "lose",
        prize: isWin ? prize : null,
      });
    }, 1200);
  };

  const branding = useMemo(() => {
    if (!campaign) return null;
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {campaign.logo_url ? (
          <img
            src={campaign.logo_url}
            alt={`Logo ${campaign.business_name}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : null}
        <h1 className="text-2xl font-semibold text-zinc-900">
          {campaign.business_name}
        </h1>
      </div>
    );
  }, [campaign]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
        Chargement...
      </div>
    );
  }
  if (!supabaseClient) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
        Supabase n’est pas encore configuré.
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-500">
        {error ?? "Campagne introuvable."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        {branding}
        <p className="text-center text-sm text-zinc-600">
          Débloque le jeu en laissant un avis et en nous suivant.
        </p>

        <div className="w-full space-y-3">
          <button
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              reviewClicked ? "bg-emerald-500" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
            onClick={() => handleAction("review")}
            type="button"
          >
            {reviewClicked ? "Avis Google validé" : "Laisser un avis Google"}
          </button>
          <button
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              followClicked ? "bg-emerald-500" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
            onClick={() => handleAction("follow")}
            type="button"
          >
            {followClicked ? "Instagram validé" : "Suivre sur Instagram"}
          </button>
        </div>

        <div className="mt-4 flex w-full flex-col items-center gap-4 rounded-3xl border border-zinc-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">
            {isUnlocked ? "Le jeu est débloqué !" : "Jeu verrouillé"}
          </p>
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full border-4 border-zinc-200 bg-[conic-gradient(at_top,_#f4f4f5,_#e4e4e7,_#f4f4f5)] ${
              spinning ? "animate-spin" : ""
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Waveon
            </span>
          </div>
          <button
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            type="button"
            onClick={handlePlay}
            disabled={!isUnlocked || !!result}
          >
            {result ? "Résultat enregistré" : "Lancer la roue"}
          </button>
          {result ? (
            <div className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-700">
              Résultat : <span className="font-semibold">{result}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

