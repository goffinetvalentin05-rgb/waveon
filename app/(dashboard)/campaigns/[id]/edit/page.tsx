"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CampaignObjective } from "@/types/db";
import { slugify } from "@/lib/slug";
import Sidebar from "../../../dashboard/components/Sidebar";

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

const businessTypes = [
  "Restaurant",
  "Bar",
  "Café",
  "Fast-food",
  "Commerce de quartier",
  "Autre",
];

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");
  const [slug, setSlug] = useState("");
  const [objective, setObjective] = useState<CampaignObjective | null>(null);
  const [link, setLink] = useState("");

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

      const row = data as CampaignRow;
      setCampaign(row);
      setBusinessName(row.business_name ?? "");
      setBusinessType(row.business_type ?? "");
      setAddress(row.address ?? "");
      setSlug(row.slug ?? "");
      setObjective(row.objective ?? null);
      setLink(row.link ?? row.target_url ?? "");
      setLoading(false);
    };

    fetchCampaign();
  }, [campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !campaign) return;

    setSaving(true);
    setError(null);

    const finalSlug = slugify(slug || businessName);
    if (!finalSlug.trim()) {
      setError("Le slug est requis.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        business_name: businessName.trim() || campaign.business_name,
        business_type: businessType || null,
        address: address.trim() || null,
        slug: finalSlug,
        objective: objective ?? campaign.objective,
        link: link.trim() || null,
        target_url: link.trim() || null,
      })
      .eq("id", campaignId)
      .eq("user_id", campaign.user_id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/campaigns");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b16] text-slate-300">
        Chargement…
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
              Modifier la campagne
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {campaign.business_name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/30"
          >
            Retour aux campagnes
          </button>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Nom du commerce
                </label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="Ex : Café de la Gare"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (!slug || slug === slugify(businessName)) {
                      setSlug(slugify(e.target.value));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Type de commerce
                </label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Adresse (optionnel)
                </label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="12 rue des Entrepreneurs, Paris"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  URL courte (slug)
                </label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="cafe-de-la-gare"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Objectif
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(objectiveLabels).map(([value, label]) => {
                    const selected = objective === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setObjective(value as CampaignObjective)
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-indigo-400/40 bg-indigo-500/10 text-white"
                            : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Lien cible (avis Google, page réseau social…)
                </label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="https://g.page/votre-restaurant"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  URL vers laquelle vos clients sont redirigés (ex. page Google
                  Avis).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/campaigns")}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30"
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
