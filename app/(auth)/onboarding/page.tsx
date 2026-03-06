"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function OnboardingPage() {
  const router = useRouter();
  const totalSteps = 4;
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState("");
  const [commonObjections, setCommonObjections] = useState("");

  useEffect(() => {
    if (!hasSupabase) return;
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        }
      } catch {
        // Si la session ne peut pas être lue, on laisse l'utilisateur voir la page.
      }
    };
    void checkSession();
  }, []);

  const canStep1 =
    fullName.trim().length >= 2 &&
    businessName.trim().length >= 2 &&
    offerDescription.trim().length >= 10;
  const canStep2 =
    whatsAppNumber.trim().length >= 6 && bookingLink.trim().length >= 5;
  const canStep3 =
    communicationStyle.trim().length >= 10 && commonObjections.trim().length >= 5;
  const canProceed =
    (step === 1 && canStep1) || (step === 2 && canStep2) || (step === 3 && canStep3);

  const handleSubmit = async () => {
    if (!hasSupabase) return;
    setLoading(true);
    setError(null);

    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const { data } = await supabase.auth.getSession();
        currentUserId = data.session?.user.id ?? null;
      }

      if (!currentUserId) {
        router.replace("/login");
        return;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: currentUserId,
        full_name: fullName.trim(),
        business_name: businessName.trim(),
        offer_description: offerDescription.trim(),
        whatsapp_number: whatsAppNumber.trim(),
        booking_link: bookingLink.trim(),
        communication_style: communicationStyle.trim(),
        common_objections: commonObjections.trim(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        setError(upsertError.message);
        return;
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
            Parle-nous de ton business
          </h1>
          <p className="mt-2 text-sm text-[#555]">
            Configure ton agent IA WhatsApp en 4 étapes.
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
                Parle-nous de ton business
              </h2>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Ton prénom et nom
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : Thomas Bernard"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Nom de ton business
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : Coaching Mindset Pro"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Décris ton offre en une phrase
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : J'aide les entrepreneurs à doubler leurs revenus en 90 jours"
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Configure ton WhatsApp
              </h2>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Ton numéro WhatsApp Business
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : +33 6 12 34 56 78"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Lien Calendly ou Google Calendar pour les bookings
                </label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : calendly.com/tonnom"
                  value={bookingLink}
                  onChange={(e) => setBookingLink(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Comment parle ton agent IA ?
              </h2>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Décris ton style de communication
                </label>
                <textarea
                  className="mt-1.5 min-h-28 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : Je parle de manière directe et bienveillante, j'utilise des emojis parfois, je tutoie toujours mes prospects..."
                  value={communicationStyle}
                  onChange={(e) => setCommunicationStyle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                  Quelles sont les objections fréquentes de tes prospects ?
                </label>
                <textarea
                  className="mt-1.5 min-h-28 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                  placeholder="Ex : C'est trop cher, j'ai pas le temps, j'ai déjà essayé..."
                  value={commonObjections}
                  onChange={(e) => setCommonObjections(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Ton agent est prêt 🚀
              </h2>
              <p className="text-sm text-[#555]">
                Waevon va maintenant répondre à tes prospects en moins de 60
                secondes. Partage ton numéro WhatsApp dans ta bio Instagram et
                laisse l'IA faire le reste.
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
                disabled={!canProceed}
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
                {loading ? "Sauvegarde en cours..." : "Accéder à mon dashboard"}
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
