"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import OnboardingPreview from "./OnboardingPreview";
import type { WheelSegment } from "@/app/(public)/[slug]/RewardWheel";

const BUSINESS_TYPES = [
  "Restaurant",
  "Bar",
  "Café",
  "Fast-food",
  "Commerce de quartier",
  "Autre",
];

const COLOR_PRESETS = [
  { primary: "#0f172a", secondary: "#6366f1", label: "Indigo" },
  { primary: "#1e3a2f", secondary: "#22c55e", label: "Vert" },
  { primary: "#422006", secondary: "#f97316", label: "Orange" },
  { primary: "#0c4a6e", secondary: "#0ea5e9", label: "Bleu" },
];

type WheelItemDraft = { id: string; label: string; kind: "win" | "lose" };

const DEFAULT_WHEEL_ITEMS: WheelItemDraft[] = [
  { id: "1", label: "Réduction 10%", kind: "win" },
  { id: "2", label: "Café offert", kind: "win" },
  { id: "3", label: "Pas de gain", kind: "lose" },
];

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [reviewLink, setReviewLink] = useState("");

  const [wheelItems, setWheelItems] = useState<WheelItemDraft[]>(DEFAULT_WHEEL_ITEMS);
  const [primaryColor, setPrimaryColor] = useState(COLOR_PRESETS[0].primary);
  const [secondaryColor, setSecondaryColor] = useState(COLOR_PRESETS[0].secondary);
  const [backgroundStyle, setBackgroundStyle] = useState<"gradient" | "solid">("gradient");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const logoPreviewUrl = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    if (!hasSupabase) return;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    };
    check();
  }, [router]);

  const segments: WheelSegment[] = useMemo(
    () => wheelItems.map((i) => ({ label: i.label, kind: i.kind })),
    [wheelItems]
  );

  const canStep1 =
    businessName.trim().length >= 2 &&
    email.trim().length >= 5 &&
    password.length >= 6 &&
    reviewLink.trim().length >= 10;
  const canStep2 = wheelItems.length >= 1 && wheelItems.every((i) => i.label.trim().length > 0);
  const totalSteps = 4;

  const handleAddWheelItem = () => {
    setWheelItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "Nouveau lot", kind: "win" as const },
    ]);
  };

  const handleUpdateWheelItem = (id: string, patch: Partial<WheelItemDraft>) => {
    setWheelItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  };

  const handleRemoveWheelItem = (id: string) => {
    setWheelItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async () => {
    if (!hasSupabase || !canStep1 || !canStep2) return;
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      const user = authData.user;
      if (!user) {
        setError("Compte non créé.");
        setLoading(false);
        return;
      }

      await supabase.from("users").upsert(
        { id: user.id, email: user.email },
        { onConflict: "id" }
      );

      const finalSlug = slugify(businessName).trim() || "ma-campagne";
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          business_name: businessName.trim(),
          business_type: businessType || null,
          slug: finalSlug,
          objective: "google",
          link: reviewLink.trim(),
          logo_url: null,
          is_active: true,
        })
        .select("id")
        .single();

      if (campaignError || !campaign) {
        setError(campaignError?.message ?? "Erreur création campagne.");
        setLoading(false);
        return;
      }

      const baseParticipations = 100;
      const winItems = wheelItems.filter((i) => i.kind === "win");
      const winCount = winItems.length;
      const maxWinsPerWin = winCount > 0 ? Math.floor(baseParticipations / winCount) : 0;
      let remainder = baseParticipations - maxWinsPerWin * winCount;

      const { data: wheel, error: wheelError } = await supabase
        .from("wheels")
        .insert({
          campaign_id: campaign.id,
          base_participations: baseParticipations,
          is_active: true,
        })
        .select("id")
        .single();

      if (wheelError || !wheel) {
        setError(wheelError?.message ?? "Erreur création roue.");
        setLoading(false);
        return;
      }

      let pos = 0;
      for (const item of wheelItems) {
        const extra = item.kind === "win" && remainder > 0 ? 1 : 0;
        if (item.kind === "win" && remainder > 0) remainder--;
        const maxWins =
          item.kind === "win" ? Math.max(1, maxWinsPerWin + extra) : 0;
        const { error: itemError } = await supabase.from("wheel_items").insert({
          wheel_id: wheel.id,
          label: item.label.trim(),
          kind: item.kind,
          max_wins: maxWins,
          is_active: true,
          position: pos++,
        });
        if (itemError) {
          setError(itemError.message);
          setLoading(false);
          return;
        }
      }

      const { error: poolError } = await supabase.rpc("init_wheel_pool", {
        p_wheel_id: wheel.id,
      });
      if (poolError) {
        console.warn("[onboarding] init_wheel_pool:", poolError.message);
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasSupabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Configuration Supabase manquante.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Waevon
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            Création de votre compte
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Étape {step} sur {totalSteps}
          </p>
          <div className="mt-3 flex justify-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 max-w-[60px] rounded-full ${
                  s <= step ? "bg-zinc-900" : "bg-zinc-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Informations commerce
              </h2>
              <p className="text-sm text-zinc-500">
                Ces informations apparaîtront sur votre page de jeu.
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Nom du commerce *
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="Ex : Café de la Gare"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Type de commerce
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Lien page Avis Google *
                </label>
                <input
                  type="url"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="https://g.page/..."
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Vos clients seront redirigés vers cette page pour laisser un avis.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Email *
                </label>
                <input
                  type="email"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="vous@commerce.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <p className="mt-1 text-xs text-zinc-400">Minimum 6 caractères.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-900">
                Configuration de la roue
              </h2>
              <p className="text-sm text-zinc-500">
                Définissez les lots que vos clients peuvent gagner.
              </p>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Lots de la roue
                </label>
                <div className="mt-2 space-y-2">
                  {wheelItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3"
                    >
                      <input
                        type="text"
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                        value={item.label}
                        onChange={(e) =>
                          handleUpdateWheelItem(item.id, { label: e.target.value })
                        }
                        placeholder="Nom du lot"
                      />
                      <select
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                        value={item.kind}
                        onChange={(e) =>
                          handleUpdateWheelItem(item.id, {
                            kind: e.target.value as "win" | "lose",
                          })
                        }
                      >
                        <option value="win">Gagné</option>
                        <option value="lose">Perdu</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveWheelItem(item.id)}
                        disabled={wheelItems.length <= 1}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddWheelItem}
                  className="mt-2 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  + Ajouter un lot
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Couleurs
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                      }}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
                        primaryColor === preset.primary
                          ? "border-zinc-900 bg-zinc-100"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded-full border border-zinc-200"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-zinc-200"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Style de fond
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBackgroundStyle("gradient")}
                    className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium ${
                      backgroundStyle === "gradient"
                        ? "border-zinc-900 bg-zinc-100"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Dégradé
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundStyle("solid")}
                    className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium ${
                      backgroundStyle === "solid"
                        ? "border-zinc-900 bg-zinc-100"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Uni
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Logo (optionnel)
                </label>
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setLogoFile(e.target.files ? e.target.files[0] : null)
                    }
                    className="text-sm text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Aperçu"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <p className="text-xs text-zinc-400">
                      Votre logo apparaîtra sur la page de jeu.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Aperçu de votre page
              </h2>
              <p className="text-sm text-zinc-500">
                C’est ce que verront vos clients après avoir scanné le QR code.
              </p>
              <div className="flex justify-center">
                <OnboardingPreview
                  businessName={businessName || "Votre commerce"}
                  logoPreviewUrl={logoPreviewUrl}
                  segments={segments}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  backgroundStyle={backgroundStyle}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-900">
                Récapitulatif
              </h2>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">Commerce</p>
                <p className="mt-1">{businessName || "—"}</p>
                <p className="mt-1">{businessType || "—"}</p>
                <p className="mt-3 font-medium text-zinc-900">Lots de la roue</p>
                <ul className="mt-1 list-inside list-disc">
                  {wheelItems.map((i) => (
                    <li key={i.id}>
                      {i.label} ({i.kind === "win" ? "gagné" : "perdu"})
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-medium text-zinc-900">Compte</p>
                <p className="mt-1">{email}</p>
              </div>
              <p className="text-sm text-zinc-500">
                En cliquant ci-dessous, vous créez votre compte et activez
                immédiatement votre roue. Vous pourrez modifier les paramètres
                depuis le tableau de bord.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Retour
            </button>
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !canStep1) || (step === 2 && !canStep2)
                }
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Continuer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading
                  ? "Création en cours…"
                  : "Créer mon compte et activer ma roue"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <a href="/login" className="font-semibold text-zinc-900 hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
