"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";
import { slugify } from "@/lib/slug";
import type { Campaign } from "@/types/db";

type CampaignStats = {
  visits: number;
  plays: number;
  reviews: number;
  wins: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabaseClient = supabase;
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [winRatio, setWinRatio] = useState(10);
  const [rewardsText, setRewardsText] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const baseUrlRef = useRef<string>(
    process.env.NEXT_PUBLIC_BASE_URL ?? ""
  );

  useEffect(() => {
    if (!baseUrlRef.current && typeof window !== "undefined") {
      baseUrlRef.current = window.location.origin;
    }
  }, []);

  const resetForm = () => {
    setBusinessName("");
    setSlug("");
    setGoogleUrl("");
    setInstagramUrl("");
    setWinRatio(10);
    setRewardsText("");
    setLogoFile(null);
  };

  const loadCampaigns = async (owner: string) => {
    if (!supabaseClient) return;
    const { data, error: campaignsError } = await supabaseClient
      .from("campaigns")
      .select("*")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false });
    if (campaignsError) {
      setError(campaignsError.message);
      return;
    }
    setCampaigns((data ?? []) as Campaign[]);
  };

  const loadStats = async (campaignId: string) => {
    if (!supabaseClient) return;
    const visits = await supabaseClient
      .from("participations")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("event_type", "visit");
    const plays = await supabaseClient
      .from("participations")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("event_type", "play");
    const reviews = await supabaseClient
      .from("participations")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("event_type", "play")
      .eq("did_review", true);
    const wins = await supabaseClient
      .from("participations")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("event_type", "play")
      .eq("result", "win");

    setStats((prev) => ({
      ...prev,
      [campaignId]: {
        visits: visits.count ?? 0,
        plays: plays.count ?? 0,
        reviews: reviews.count ?? 0,
        wins: wins.count ?? 0,
      },
    }));
  };

  useEffect(() => {
    const init = async () => {
      if (!supabaseClient) {
        setError("Supabase n’est pas encore configuré.");
        setLoading(false);
        return;
      }
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setUserId(data.session.user.id);
      await loadCampaigns(data.session.user.id);
      setLoading(false);
    };
    init();
  }, [router, supabaseClient]);

  useEffect(() => {
    campaigns.forEach((campaign) => {
      void loadStats(campaign.id);
    });
  }, [campaigns]);

  useEffect(() => {
    const generateQrCodes = async () => {
      const nextQrCodes: Record<string, string> = {};
      for (const campaign of campaigns) {
        const url = `${baseUrlRef.current}/${campaign.slug}`;
        nextQrCodes[campaign.id] = await QRCode.toDataURL(url, {
          margin: 1,
          width: 220,
        });
      }
      setQrCodes(nextQrCodes);
    };
    if (campaigns.length) {
      void generateQrCodes();
    }
  }, [campaigns]);

  const handleLogout = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    router.replace("/login");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabaseClient) {
      setError("Supabase n’est pas encore configuré.");
      return;
    }
    if (!userId) return;
    setCreating(true);
    setError(null);

    const finalSlug = slugify(slug || businessName);
    if (!finalSlug) {
      setError("Le nom du commerce est requis.");
      setCreating(false);
      return;
    }

    let logoUrl: string | null = null;
    if (logoFile) {
      const extension = logoFile.name.split(".").pop() ?? "png";
      const path = `${userId}/${finalSlug}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        setCreating(false);
        return;
      }
      const { data } = supabaseClient.storage.from("logos").getPublicUrl(path);
      logoUrl = data.publicUrl;
    }

    const { data: newCampaign, error: campaignError } = await supabaseClient
      .from("campaigns")
      .insert({
        owner_id: userId,
        slug: finalSlug,
        business_name: businessName,
        logo_url: logoUrl,
        google_review_url: googleUrl,
        instagram_url: instagramUrl,
        win_ratio: winRatio,
      })
      .select("*")
      .single();

    if (campaignError || !newCampaign) {
      setError(campaignError?.message ?? "Erreur lors de la création.");
      setCreating(false);
      return;
    }

    const rewards = rewardsText
      .split("\n")
      .map((label) => label.trim())
      .filter(Boolean);

    if (rewards.length) {
      const rewardsPayload = rewards.map((label) => ({
        campaign_id: newCampaign.id,
        label,
      }));
      await supabaseClient.from("rewards").insert(rewardsPayload);
    }

    resetForm();
    await loadCampaigns(userId);
    setCreating(false);
  };

  const campaignCards = useMemo(
    () =>
      campaigns.map((campaign) => {
        const campaignStats = stats[campaign.id];
        const publicUrl = `${baseUrlRef.current}/${campaign.slug}`;
        return (
          <div
            key={campaign.id}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Campagne
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">
                  {campaign.business_name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{campaign.slug}</p>
              </div>
              <button
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300"
                type="button"
                onClick={() => navigator.clipboard.writeText(publicUrl)}
              >
                Copier le lien
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2 text-sm text-zinc-600">
                <p>
                  <span className="font-semibold text-zinc-900">
                    {campaignStats?.visits ?? 0}
                  </span>{" "}
                  visites
                </p>
                <p>
                  <span className="font-semibold text-zinc-900">
                    {campaignStats?.plays ?? 0}
                  </span>{" "}
                  participations
                </p>
                <p>
                  <span className="font-semibold text-zinc-900">
                    {campaignStats?.reviews ?? 0}
                  </span>{" "}
                  avis générés
                </p>
                <p>
                  <span className="font-semibold text-zinc-900">
                    {campaignStats?.wins ?? 0}
                  </span>{" "}
                  gains distribués
                </p>
              </div>
              {qrCodes[campaign.id] ? (
                <div className="flex items-center justify-center rounded-2xl bg-zinc-50 p-3">
                  <img
                    src={qrCodes[campaign.id]}
                    alt={`QR code ${campaign.business_name}`}
                    className="h-28 w-28"
                  />
                </div>
              ) : null}
            </div>
          </div>
        );
      }),
    [campaigns, stats, qrCodes]
  );

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

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Dashboard commerçant
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              Pilote tes campagnes Waveon
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Crée une campagne et récupère le QR code à afficher en boutique.
            </p>
          </div>
          <button
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300"
            onClick={handleLogout}
            type="button"
          >
            Déconnexion
          </button>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nouvelle campagne
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Paramètre ton branding et tes liens d’acquisition.
          </p>
          <form className="mt-6 grid gap-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Nom du commerce
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  value={businessName}
                  onChange={(event) => {
                    setBusinessName(event.target.value);
                    setSlug(slugify(event.target.value));
                  }}
                  placeholder="Kebab du coin"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Slug public
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  placeholder="kebab-du-coin"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Lien Google Avis
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  value={googleUrl}
                  onChange={(event) => setGoogleUrl(event.target.value)}
                  placeholder="https://g.page/..."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Lien Instagram
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  placeholder="https://instagram.com/..."
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Logo (optionnel)
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setLogoFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ratio gagnant
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  type="number"
                  min={1}
                  value={winRatio}
                  onChange={(event) => setWinRatio(Number(event.target.value))}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Exemple : 10 signifie 1 gain pour 10 participations.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Récompenses (une par ligne)
              </label>
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                value={rewardsText}
                onChange={(event) => setRewardsText(event.target.value)}
                placeholder="Boisson offerte\n-10% sur la coupe\nDessert gratuit"
              />
            </div>
            {error ? (
              <p className="rounded-xl bg-zinc-100 px-4 py-3 text-xs text-zinc-600">
                {error}
              </p>
            ) : null}
            <button
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              type="submit"
              disabled={creating}
            >
              {creating ? "Création..." : "Créer la campagne"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Campagnes actives
          </h2>
          {campaigns.length ? (
            <div className="grid gap-4 md:grid-cols-2">{campaignCards}</div>
          ) : (
            <p className="text-sm text-zinc-500">
              Aucune campagne pour le moment.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

