"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { CampaignObjective } from "@/types/db";
import CampaignCard from "../dashboard/components/CampaignCard";
import Sidebar from "../dashboard/components/Sidebar";

type CampaignRow = {
  id: string;
  user_id: string;
  slug: string;
  business_name: string;
  business_type?: string | null;
  address?: string | null;
  objective?: CampaignObjective | null;
  link?: string | null;
  target_url?: string | null;
  is_active?: boolean | null;
  created_at: string;
};

const objectiveLabels: Record<CampaignObjective, string> = {
  google: "Avis Google",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const getTargetUrl = (campaign?: CampaignRow | null) =>
    campaign?.target_url || campaign?.link || "";

  const fetchCampaigns = async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setCampaigns((data ?? []) as CampaignRow[]);
  };

  useEffect(() => {
    const init = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setLoading(false);
        return;
      }
      const id = session.session.user.id;
      setUserId(id);
      await fetchCampaigns(id);
      setLoading(false);
    };
    init();
  }, []);

  const handleActivate = async (campaignId: string) => {
    if (!userId) return;
    setUpdating(campaignId);
    setError(null);

    const { error: deactivateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })
      .eq("user_id", userId);

    if (deactivateError) {
      setError(deactivateError.message);
      setUpdating(null);
      return;
    }

    const { error: activateError } = await supabase
      .from("campaigns")
      .update({ is_active: true })
      .eq("id", campaignId);

    if (activateError) {
      setError(activateError.message);
      setUpdating(null);
      return;
    }

    await fetchCampaigns(userId);
    setUpdating(null);
  };

  const handleDeactivate = async (campaignId: string) => {
    if (!userId) return;
    setUpdating(campaignId);
    setError(null);

    const { error: deactivateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })
      .eq("id", campaignId);

    if (deactivateError) {
      setError(deactivateError.message);
      setUpdating(null);
      return;
    }

    await fetchCampaigns(userId);
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Chargement des campagnes…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-[#0b0b16] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_60%)]" />
        <div className="absolute right-[-180px] top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_70%)] blur-[180px]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>
      <Sidebar />

      <main className="relative flex-1 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Campagnes
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Toutes vos campagnes
            </h1>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            {campaigns.length} campagne(s)
          </span>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {campaigns.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
            <p className="font-medium text-white">Aucune campagne</p>
            <p className="mt-2">
              Créez votre première campagne pour activer votre QR code.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {campaigns.map((campaign) => {
              const isActive = !!campaign.is_active;
              return (
                <CampaignCard
                  key={campaign.id}
                  name={campaign.business_name}
                  objectiveLabel={
                    campaign.objective
                      ? objectiveLabels[campaign.objective]
                      : undefined
                  }
                  status={isActive ? "active" : "inactive"}
                  targetUrl={getTargetUrl(campaign)}
                  slug={campaign.slug}
                  createdAt={campaign.created_at}
                  detailHref={`/campaigns/${campaign.id}`}
                  onActivate={
                    !isActive ? () => handleActivate(campaign.id) : undefined
                  }
                  onDeactivate={
                    isActive ? () => handleDeactivate(campaign.id) : undefined
                  }
                  isBusy={updating === campaign.id}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

