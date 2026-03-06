"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CampaignObjective } from "@/types/db";
import CampaignCard from "./components/CampaignCard";
import CampaignWizard from "./components/CampaignWizard";
import QRCodeBox from "./components/QRCodeBox";
import Sidebar from "./components/Sidebar";
import StatsCard from "./components/StatsCard";

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

export default function DashboardPage() {
  const router = useRouter();
  const baseUrlRef = useRef<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignRow | null>(null);
  const [listUpdating, setListUpdating] = useState<string | null>(null);

  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState({
    prospects: 0,
    conversations: 0,
    callsBooked: 0,
  });

  const getTargetUrl = (campaign?: CampaignRow | null) =>
    campaign?.link ?? "";

  const publicUrl = useMemo(() => {
    if (!activeCampaign) return "";
    return `${baseUrlRef.current}/${activeCampaign.slug}`;
  }, [activeCampaign]);

  useEffect(() => {
    baseUrlRef.current = window.location.origin;
  }, []);

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

    const rows = (data ?? []) as CampaignRow[];
    setCampaigns(rows);
    setActiveCampaign(rows.find((campaign) => campaign.is_active) ?? null);
  };

  const fetchDashboardStats = useCallback(async (id: string) => {
    const { data: ownedCampaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("user_id", id);

    if (campaignsError) {
      setError(campaignsError.message);
      return;
    }

    const campaignIds = (ownedCampaigns ?? []).map((campaign) => campaign.id);
    if (campaignIds.length === 0) {
      setStats({ prospects: 0, conversations: 0, callsBooked: 0 });
      return;
    }

    const [{ count: prospectsCount }, { count: conversationsCount }, { data: spins }] =
      await Promise.all([
        supabase
          .from("participations")
          .select("id", { count: "exact", head: true })
          .in("campaign_id", campaignIds),
        supabase
          .from("spins")
          .select("id", { count: "exact", head: true })
          .in("campaign_id", campaignIds),
        supabase.from("spins").select("id").in("campaign_id", campaignIds),
      ]);

    const spinIds = (spins ?? []).map((spin) => spin.id);
    let callsBookedCount = 0;
    if (spinIds.length > 0) {
      const { count } = await supabase
        .from("reward_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "claimed")
        .in("spin_id", spinIds);
      callsBookedCount = count ?? 0;
    }

    setStats({
      prospects: prospectsCount ?? 0,
      conversations: conversationsCount ?? 0,
      callsBooked: callsBookedCount,
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const id = session.session.user.id;
      setUserId(id);
      await fetchCampaigns(id);
      await fetchDashboardStats(id);
      setLoading(false);
    };
    init();
  }, [fetchDashboardStats, router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dashboard-stats-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        async () => {
          await fetchDashboardStats(userId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participations" },
        async () => {
          await fetchDashboardStats(userId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spins" },
        async () => {
          await fetchDashboardStats(userId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reward_claims" },
        async () => {
          await fetchDashboardStats(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchDashboardStats, userId]);

  const handleActivate = async (campaignId: string) => {
    if (!userId) return;
    setListUpdating(campaignId);
    setError(null);

    const { error: deactivateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })
      .eq("user_id", userId);

    if (deactivateError) {
      setError(deactivateError.message);
      setListUpdating(null);
      return;
    }

    const { error: activateError } = await supabase
      .from("campaigns")
      .update({ is_active: true })
      .eq("id", campaignId);

    if (activateError) {
      setError(activateError.message);
      setListUpdating(null);
      return;
    }

    await fetchCampaigns(userId);
    setListUpdating(null);
  };

  const handleDeactivate = async (campaignId: string) => {
    if (!userId) return;
    setListUpdating(campaignId);
    setError(null);

    const { error: deactivateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })
      .eq("id", campaignId);

    if (deactivateError) {
      setError(deactivateError.message);
      setListUpdating(null);
      return;
    }

    await fetchCampaigns(userId);
    setListUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Chargement du dashboard…
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
      <Sidebar onCreateCampaign={() => setShowWizard(true)} />

      <main className="relative flex-1 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Tableau de bord
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {activeCampaign?.business_name || "Votre tableau de bord"}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {activeCampaign?.objective
                ? objectiveLabels[activeCampaign.objective]
                : "Aucune campagne active"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {activeCampaign ? "Campagne active" : "Aucune campagne active"}
            </span>
            <button
              type="button"
              onClick={() => setShowWizard((prev) => !prev)}
              className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.35)] transition hover:brightness-110"
            >
              {showWizard ? "Fermer la création" : "Créer une campagne"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Campagne active</p>
                  <h2 className="text-lg font-semibold text-white">
                    {activeCampaign
                      ? activeCampaign.business_name
                      : "Aucune campagne active"}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                  1 campagne active
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Objectif :{" "}
                <span className="font-medium text-slate-100">
                  {activeCampaign?.objective
                    ? objectiveLabels[activeCampaign.objective]
                    : "Non défini"}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Lien cible :{" "}
                <span className="font-medium text-slate-100">
                  {getTargetUrl(activeCampaign) || "À renseigner"}
                </span>
              </p>
              {activeCampaign ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={publicUrl}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 transition hover:border-white/30"
                  >
                    Voir la page publique
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(activeCampaign.id)}
                    disabled={listUpdating === activeCampaign.id}
                    className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    Mettre en pause
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="mt-4 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Créer ma première campagne
                </button>
              )}
            </div>

            {activeCampaign ? (
              <CampaignCard
                name={activeCampaign.business_name}
                objectiveLabel={
                  activeCampaign.objective
                    ? objectiveLabels[activeCampaign.objective]
                    : undefined
                }
                status="active"
                targetUrl={getTargetUrl(activeCampaign)}
                slug={activeCampaign.slug}
                createdAt={activeCampaign.created_at}
                detailHref={`/campaigns/${activeCampaign.id}`}
                onDeactivate={() => handleDeactivate(activeCampaign.id)}
                isBusy={listUpdating === activeCampaign.id}
              />
            ) : null}
          </div>

          <div className="space-y-4">
            <QRCodeBox
              title="QR code de la campagne"
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
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatsCard
                label="Prospects"
                value={stats.prospects}
                hint="Depuis Supabase"
              />
              <StatsCard
                label="Conversations"
                value={stats.conversations}
                hint="Depuis Supabase"
              />
              <StatsCard
                label="Appels bookés"
                value={stats.callsBooked}
                hint="Depuis Supabase"
              />
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Création guidée
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                4 étapes simples pour lancer votre campagne en moins de 2
                minutes.
              </p>
            </div>
          </div>

          {showWizard ? (
            <div className="mt-6">
              <CampaignWizard
                onCreated={async () => {
                  if (!userId) return;
                  await fetchCampaigns(userId);
                  setShowWizard(false);
                }}
                onCancel={() => setShowWizard(false)}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
              <p className="font-medium text-white">
                Aucune campagne en cours de création
              </p>
              <p className="mt-2">
                Lancez l’assistant pour créer votre prochaine campagne en 4
                étapes.
              </p>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="mt-4 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Démarrer l’assistant
              </button>
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Gestion des campagnes
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Activez une campagne, mettez les autres en pause.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {campaigns.length} campagne(s)
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
              <p className="font-medium text-white">Aucune campagne</p>
              <p className="mt-2">
                Commencez par créer votre première campagne pour activer le QR
                code.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
                      !isActive
                        ? () => handleActivate(campaign.id)
                        : undefined
                    }
                    onDeactivate={
                      isActive ? () => handleDeactivate(campaign.id) : undefined
                    }
                    isBusy={listUpdating === campaign.id}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <div>
            <h2 className="text-lg font-semibold text-white">Paramètres</h2>
            <p className="mt-1 text-sm text-slate-300">
              Vos informations visibles dans la campagne active.
            </p>
          </div>
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
              <label className="text-sm font-medium text-slate-300">Type</label>
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
                Lien cible
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100"
                value={getTargetUrl(activeCampaign)}
                placeholder="Non défini"
                disabled
              />
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Récompenses (bientôt)
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Préparez la gamification pour booster encore plus les actions.
              </p>
            </div>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
              À venir
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              "Choisir vos lots",
              "Définir les probabilités",
              "Limiter les gains par jour",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


