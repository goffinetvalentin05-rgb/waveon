"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import type { CampaignObjective } from "@/types/db";
import WizardStep from "./WizardStep";

type CampaignWizardProps = {
  onCreated?: () => void;
  onCancel?: () => void;
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

export default function CampaignWizard({
  onCreated,
  onCancel,
}: CampaignWizardProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");
  const [slug, setSlug] = useState("");
  const [objective, setObjective] = useState<CampaignObjective | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const totalSteps = 4;

  const logoPreview = useMemo(() => {
    if (!logoFile) return "";
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const resetForm = () => {
    setBusinessName("");
    setBusinessType("");
    setAddress("");
    setSlug("");
    setObjective(null);
    setTargetUrl("");
    setLogoFile(null);
    setStep(1);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setError("Utilisateur non connecté");
      setCreating(false);
      return;
    }

    if (!businessName || !objective || !targetUrl) {
      setError("Champs requis manquants");
      setCreating(false);
      return;
    }

    const finalSlug = slugify(slug || businessName);

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (updateError) {
      setError(updateError.message);
      setCreating(false);
      return;
    }

    const response = await supabase.from("campaigns").insert({
      user_id: user.id,
      business_name: businessName,
      business_type: businessType || null,
      address: address || null,
      objective,
      link: targetUrl,
      slug: finalSlug,
      is_active: true,
    });

    if (response.error) {
      setError(response.error.message);
      setCreating(false);
      return;
    }

    resetForm();
    setCreating(false);
    onCreated?.();
  };

  const canContinue =
    (step === 1 && businessName.trim().length > 1) ||
    (step === 2 && !!objective) ||
    (step === 3 && targetUrl.trim().length > 6) ||
    step === 4;

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {step === 1 && (
        <WizardStep
          step={1}
          title="Infos commerce"
          description="Renseignez les informations visibles sur votre QR code."
        >
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
                  setSlug(slugify(e.target.value));
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
                URL courte (optionnel)
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
                Logo (optionnel)
              </label>
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setLogoFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="text-xs text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Aperçu logo"
                    className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    Glissez-déposez ou choisissez un fichier image.
                  </p>
                )}
              </div>
            </div>
          </div>
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep
          step={2}
          title="Objectif"
          description="Un seul objectif pour garder un message clair."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(objectiveLabels).map(([value, label]) => {
              const selected = objective === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setObjective(value as CampaignObjective)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-indigo-400/40 bg-indigo-500/10 text-white"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                  <span
                    className={`text-xs ${
                      selected ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {selected ? "Sélectionné" : "Choisir"}
                  </span>
                </button>
              );
            })}
          </div>
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep
          step={3}
          title="Lien cible"
          description="Vos clients seront redirigés vers cette page."
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Lien cible
            </label>
            <input
              className="w-full rounded-lg border border-white/10 bg-[#121225] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              placeholder="https://g.page/votre-restaurant"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Nous vérifions ce lien pour vous éviter les erreurs.
            </p>
          </div>
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep
          step={4}
          title="Validation"
          description="Dernier coup d'œil avant la mise en ligne."
        >
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">
              Résumé de votre campagne
            </p>
            <div className="mt-3 space-y-2">
              <p>
                <span className="font-medium text-white">Commerce :</span>{" "}
                {businessName || "Non renseigné"}
              </p>
              <p>
                <span className="font-medium text-white">Objectif :</span>{" "}
                {objective ? objectiveLabels[objective] : "Non renseigné"}
              </p>
              <p>
                <span className="font-medium text-white">Lien :</span>{" "}
                {targetUrl || "Non renseigné"}
              </p>
            </div>
          </div>
        </WizardStep>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 disabled:opacity-50"
        >
          Retour
        </button>
        <div className="flex flex-wrap gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30"
            >
              Annuler
            </button>
          ) : null}
          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
              disabled={!canContinue}
              className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Continuer
            </button>
          ) : (
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {creating ? "Création…" : "Créer la campagne"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

