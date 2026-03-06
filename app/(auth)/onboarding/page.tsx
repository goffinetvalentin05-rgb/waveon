"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { getDominantColorFromImageUrl } from "@/lib/colorUtils";
import BrandColorPicker from "@/components/BrandColorPicker";
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

type WheelItemDraft = {
  id: string;
  label: string;
  kind: "win" | "lose";
  max_wins: number;
};

const PARTICIPATION_PRESETS = [50, 100, 200] as const;

const DEFAULT_WHEEL_ITEMS: WheelItemDraft[] = [
  { id: "1", label: "Réduction 10%", kind: "win", max_wins: 10 },
  { id: "2", label: "Café offert", kind: "win", max_wins: 10 },
  { id: "3", label: "Pas de gain", kind: "lose", max_wins: 0 },
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

  const [baseParticipations, setBaseParticipations] = useState<number>(100);
  const [customParticipations, setCustomParticipations] = useState("");
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
    if (!logoPreviewUrl) return;
    getDominantColorFromImageUrl(logoPreviewUrl).then((hex) => {
      setPrimaryColor(hex);
    });
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

  const totalParticipations =
    PARTICIPATION_PRESETS.includes(baseParticipations as 50 | 100 | 200)
      ? baseParticipations
      : (() => {
          const n = parseInt(customParticipations, 10);
          return Number.isFinite(n) && n >= 1 ? n : 100;
        })();

  const totalUsed = useMemo(
    () =>
      wheelItems
        .filter((i) => i.kind === "win")
        .reduce((sum, i) => sum + Math.max(0, i.max_wins ?? 0), 0),
    [wheelItems]
  );

  const distributionError =
    totalUsed > totalParticipations
      ? `Les gains (${totalUsed}) ne peuvent pas dépasser le nombre de participations (${totalParticipations}). Réduisez le nombre de fois par lot ou augmentez le total.`
      : null;

  const canStep1 =
    businessName.trim().length >= 2 &&
    email.trim().length >= 5 &&
    password.length >= 6 &&
    reviewLink.trim().length >= 10;
  const canStep2 =
    wheelItems.length >= 1 &&
    wheelItems.every((i) => i.label.trim().length > 0) &&
    totalParticipations >= 1 &&
    !distributionError &&
    totalUsed <= totalParticipations;
  const totalSteps = 4;

  const handleAddWheelItem = () => {
    setWheelItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "Nouveau lot", kind: "win", max_wins: 1 },
    ]);
  };

  const handleUpdateWheelItem = (id: string, patch: Partial<WheelItemDraft>) => {
    setWheelItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if (patch.kind === "lose") next.max_wins = 0;
        if (patch.kind === "win" && i.kind === "lose") next.max_wins = next.max_wins ?? 1;
        return next;
      })
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

      const baseParticipationsValue = totalParticipations;

      const { data: wheel, error: wheelError } = await supabase
        .from("wheels")
        .insert({
          campaign_id: campaign.id,
          base_participations: baseParticipationsValue,
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
        const maxWins = item.kind === "win" ? Math.max(0, item.max_wins ?? 0) : 0;
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.14),transparent_60%)]" />
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4 text-sm text-amber-300">
          Configuration Supabase manquante.
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.14),transparent_60%)]" />
      </div>
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-6 flex flex-col items-center leading-none">
            <Image
              src="/logo_waevon.png"
              alt="Waevon"
              width={220}
              height={78}
              className="h-12 w-auto"
              priority
            />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Créer mon compte
          </h1>
          <p className="mt-2 text-sm text-[#555]">
            Lance ton agent Waevon en moins de 10 minutes.
          </p>
          <p className="mt-1 text-sm text-[#555]">
            Étape {step} sur {totalSteps}
          </p>
          <div className="mt-3 flex justify-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 max-w-[60px] rounded-full ${
                  s <= step ? "bg-[#39FF14]" : "bg-[#333]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#39FF14]/20 bg-[#0f0f0f] p-6 shadow-[0_24px_52px_rgba(57,255,20,0.12)]">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Informations commerce
              </h2>
              <p className="text-sm text-[#555]">
                Ces informations apparaîtront sur votre page de jeu.
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Nom du commerce *
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : Café de la Gare"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Type de commerce
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:border-[#39FF14] focus:outline-none"
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
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Lien page Avis Google *
                </label>
                <input
                  type="url"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="https://g.page/..."
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                />
                <p className="mt-1 text-xs text-[#888]">
                  Vos clients seront redirigés vers cette page pour laisser un avis.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Email *
                </label>
                <input
                  type="email"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <p className="mt-1 text-xs text-[#888]">Minimum 6 caractères.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">
                Configuration de la roue
              </h2>
              <p className="text-sm text-[#555]">
                Définissez les lots que vos clients peuvent gagner.
              </p>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Sur combien de participations souhaitez-vous distribuer vos lots ?
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PARTICIPATION_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setBaseParticipations(n);
                        setCustomParticipations("");
                      }}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition ${
                        baseParticipations === n && !customParticipations
                          ? "border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]"
                          : "border-[#333] text-[#888] hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      placeholder="Personnalisé"
                      className="w-24 rounded-xl border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                      value={customParticipations}
                      onChange={(e) => {
                        setCustomParticipations(e.target.value.replace(/\D/g, ""));
                        if (e.target.value.trim()) setBaseParticipations(0);
                      }}
                    />
                    <span className="text-xs text-[#888]">participations</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Lots de la roue
                </label>
                <div className="mt-2 space-y-2">
                  {wheelItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-[#333] bg-[#151515] p-3"
                    >
                      <input
                        type="text"
                        className="min-w-[120px] flex-1 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                        value={item.label}
                        onChange={(e) =>
                          handleUpdateWheelItem(item.id, { label: e.target.value })
                        }
                        placeholder="Nom du lot"
                      />
                      <select
                        className="rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-[#39FF14] focus:outline-none"
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
                      {item.kind === "win" ? (
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`max-wins-${item.id}`}
                            className="text-xs font-medium text-[#888] whitespace-nowrap"
                          >
                            Nb. de fois gagnable
                          </label>
                          <input
                            id={`max-wins-${item.id}`}
                            type="number"
                            min={0}
                            max={totalParticipations}
                            aria-label="Nombre de fois que ce lot peut être gagné"
                            className="w-16 rounded-lg border border-[#333] bg-[#1a1a1a] px-2 py-2 text-sm text-white focus:border-[#39FF14] focus:outline-none"
                            value={item.max_wins}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              handleUpdateWheelItem(item.id, {
                                max_wins: Number.isFinite(v) ? Math.max(0, v) : 0,
                              });
                            }}
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveWheelItem(item.id)}
                        disabled={wheelItems.length <= 1}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddWheelItem}
                  className="mt-2 rounded-xl border border-dashed border-[#333] bg-[#111] px-4 py-2 text-sm font-medium text-[#39FF14] hover:bg-[#1a1a1a]"
                >
                  + Ajouter un lot
                </button>
                <p className="mt-3 text-sm font-medium text-white/90">
                  Utilisé : {totalUsed} / {totalParticipations} participations
                  {totalUsed <= totalParticipations && totalParticipations - totalUsed > 0 ? (
                    <span className="ml-1 text-[#888]">
                      (le reste = « Perdu »)
                    </span>
                  ) : null}
                </p>
                {distributionError ? (
                  <p className="mt-2 text-sm text-rose-300" role="alert">
                    {distributionError}
                  </p>
                ) : null}
              </div>

              <BrandColorPicker
                label="Couleurs"
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                onChange={(p, s) => {
                  setPrimaryColor(p);
                  setSecondaryColor(s);
                }}
                presets={COLOR_PRESETS}
              />
              {logoPreviewUrl ? (
                <p className="text-xs text-[#888]">
                  La couleur principale a été suggérée depuis votre logo. Vous pouvez la modifier ci-dessus.
                </p>
              ) : null}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Style de fond
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBackgroundStyle("gradient")}
                    className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium ${
                      backgroundStyle === "gradient"
                        ? "border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]"
                        : "border-[#333] text-[#888] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Dégradé
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundStyle("solid")}
                    className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium ${
                      backgroundStyle === "solid"
                        ? "border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]"
                        : "border-[#333] text-[#888] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Uni
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Logo (optionnel)
                </label>
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-[#333] bg-[#151515] p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setLogoFile(e.target.files ? e.target.files[0] : null)
                    }
                    className="text-sm text-[#888] file:mr-2 file:rounded-lg file:border-0 file:bg-[#39FF14] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black"
                  />
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Aperçu"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <p className="text-xs text-[#888]">
                      Votre logo apparaîtra sur la page de jeu.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Aperçu de votre page
              </h2>
              <p className="text-sm text-[#555]">
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
              <h2 className="text-lg font-semibold text-white">
                Récapitulatif
              </h2>
              <div className="rounded-xl border border-[#333] bg-[#151515] p-4 text-sm text-white/80">
                <p className="font-medium text-white">Commerce</p>
                <p className="mt-1">{businessName || "—"}</p>
                <p className="mt-1">{businessType || "—"}</p>
                <p className="mt-3 font-medium text-white">Lots de la roue</p>
                <ul className="mt-1 list-inside list-disc">
                  {wheelItems.map((i) => (
                    <li key={i.id}>
                      {i.label} ({i.kind === "win" ? `${i.max_wins} fois gagnable` : "perdu"})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[#888]">
                  Utilisé : {totalUsed} / {totalParticipations} participations
                </p>
                <p className="mt-3 font-medium text-white">Compte</p>
                <p className="mt-1">{email}</p>
              </div>
              <p className="text-sm text-[#555]">
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
              className="rounded-xl border border-[#333] bg-[#151515] px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-[#1a1a1a] disabled:opacity-50"
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
                title={
                  step === 2 && distributionError
                    ? distributionError
                    : undefined
                }
                className="rounded-xl bg-[#39FF14] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                Continuer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl bg-[#39FF14] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {loading
                  ? "Création en cours…"
                  : "Créer mon compte"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#888]">
          Déjà un compte ?{" "}
          <a href="/login" className="font-semibold text-[#39FF14] hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
