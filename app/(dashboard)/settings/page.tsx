"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { CampaignObjective } from "@/types/db";
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
  is_active?: boolean | null;
  created_at: string;
};

const objectiveLabels: Record<CampaignObjective, string> = {
  google: "Avis Google",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<CampaignRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setLoading(false);
        return;
      }
      const id = session.session.user.id;
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setActiveCampaign(((data ?? [])[0] as CampaignRow) ?? null);
      setLoading(false);
    };

    init();
  }, []);

  const targetUrl =
    activeCampaign?.link ?? "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Chargement des paramètres…
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
            <p className="text-sm text-slate-400">Paramètres</p>
            <h1 className="text-2xl font-semibold text-white">
              Infos du commerce
            </h1>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <p className="text-sm text-slate-300">
            Basé sur la campagne active (modifiable bientôt).
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Nom du commerce
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={activeCampaign?.business_name || ""}
                placeholder="Non défini"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Type de commerce
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={activeCampaign?.business_type || ""}
                placeholder="Non défini"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Adresse
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={activeCampaign?.address || ""}
                placeholder="Non défini"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Objectif actif
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={
                  activeCampaign?.objective
                    ? objectiveLabels[activeCampaign.objective]
                    : ""
                }
                placeholder="Non défini"
                disabled
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Lien cible
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={targetUrl}
                placeholder="Non défini"
                disabled
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

