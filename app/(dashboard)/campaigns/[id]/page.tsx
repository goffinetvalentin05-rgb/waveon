"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CampaignObjective } from "@/types/db";
import QRCodeBox from "../../dashboard/components/QRCodeBox";
import Sidebar from "../../dashboard/components/Sidebar";
import StatsCard from "../../dashboard/components/StatsCard";
import WheelConfigurator from "../../dashboard/components/WheelConfigurator";

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

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id as string | undefined;
  const baseUrlRef = useRef<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [scans, setScans] = useState(0);
  const [actions, setActions] = useState(0);

  const publicUrl = useMemo(() => {
    if (!campaign) return "";
    return `${baseUrlRef.current}/${campaign.slug}`;
  }, [campaign]);

  useEffect(() => {
    baseUrlRef.current = window.location.origin;
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaign = async () => {
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setCampaign(data as CampaignRow);
      setLoading(false);
    };

    fetchCampaign();
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;

    const fetchStats = async () => {
      const { count: scansCount } = await supabase
        .from("participations")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

      const { count: actionsCount } = await supabase
        .from("participations")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .or("did_review.eq.true,did_follow.eq.true,event_type.eq.action");

      setScans(scansCount ?? 0);
      setActions(actionsCount ?? 0);
    };

    fetchStats();
  }, [campaignId]);

  const conversion = scans > 0 ? Math.round((actions / scans) * 100) : 0;
  const targetUrl = campaign?.target_url || campaign?.link || "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Chargement de la campagne…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Campagne introuvable.
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
              Dashboard campagne
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {campaign.business_name}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {campaign.objective
                ? objectiveLabels[campaign.objective]
                : "Objectif non défini"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {campaign.is_active ? "Active" : "En pause"}
            </span>
            {publicUrl ? (
              <a
                href={publicUrl}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/30"
              >
                Lien public
              </a>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatsCard label="Scans" value={scans} hint="Sur 30 jours" />
              <StatsCard label="Actions" value={actions} hint="Avis & follows" />
              <StatsCard
                label="Conversion"
                value={`${conversion}%`}
                hint="Actions / scans"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
              <h2 className="text-base font-semibold text-white">
                Évolution de la campagne
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Visualisez l’impact des 30 derniers jours.
              </p>
              <div className="mt-4 grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 rounded-lg border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
              <h2 className="text-base font-semibold text-white">
                Informations
              </h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-slate-400">Statut</p>
                  <p className="font-medium text-white">
                    {campaign.is_active ? "Active" : "En pause"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Lien cible</p>
                  <p className="font-medium text-white">
                    {targetUrl || "Non renseigné"}
                  </p>
                </div>
              </div>
            </div>

            <WheelConfigurator campaignId={campaign.id} />
          </div>

          <div className="space-y-4">
            <QRCodeBox
              title="QR code dédié"
              publicUrl={publicUrl}
              qrUrl={
                publicUrl
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      publicUrl
                    )}`
                  : "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="
              }
              downloadUrl={
                publicUrl
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                      publicUrl
                    )}`
                  : "https://api.qrserver.com/v1/create-qr-code/?size=600x600&data="
              }
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
              <p className="font-semibold text-white">Actions rapides</p>
              <div className="mt-3 space-y-2">
                <button className="w-full rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:border-white/30">
                  Mettre en pause
                </button>
                <button className="w-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110">
                  Télécharger le QR
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

