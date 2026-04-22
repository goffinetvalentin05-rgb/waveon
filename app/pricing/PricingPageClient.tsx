"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { BrandLogoLink } from "@/components/landing/BrandLogoLink";
import { landingContent } from "@/lib/landing/config";
import {
  hasActiveSubscription,
  parseSubscriptionPlan,
} from "@/lib/subscription/access";
import type { BillingPlanId } from "@/lib/stripe/config";
import { PLAN_LABELS, PLAN_MONTHLY_PRICE_CHF } from "@/lib/stripe/config";
import { supabase } from "@/lib/supabase/client";
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

type BizSubRow = {
  status: string;
  plan: string | null;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4.5 9.5 7.5 12.5 14 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPageClient() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);
  const [bizSub, setBizSub] = useState<BizSubRow | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (!uid) {
        setSessionReady(true);
        return;
      }
      const liveRes = await fetch("/api/subscription/live", { credentials: "same-origin" });
      if (liveRes.ok) {
        const body = (await liveRes.json()) as Record<string, unknown>;
        setBizSub({
          status: typeof body.status === "string" ? body.status : "none",
          plan: typeof body.plan === "string" || body.plan === null ? (body.plan as string | null) : null,
        });
      } else {
        setBizSub({ status: "none", plan: null });
      }
      setSessionReady(true);
    })();
  }, []);

  const startCheckout = useCallback(
    async (plan: BillingPlanId) => {
      if (!publishableKey) {
        alert("Configuration Stripe incomplète (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).");
        return;
      }
      setLoadingPlan(plan);
      try {
        await loadStripe(publishableKey);
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
          credentials: "same-origin",
        });
        const raw = await res.text();
        let body: { url?: string; error?: string } = {};
        if (raw.trim()) {
          try {
            body = JSON.parse(raw) as { url?: string; error?: string };
          } catch {
            throw new Error(
              `Réponse serveur invalide (${res.status}). Si le problème persiste, vérifie les logs Vercel.`
            );
          }
        }
        if (!res.ok) {
          throw new Error(
            body.error ?? `Erreur serveur (${res.status}). Réponse vide ou non JSON.`
          );
        }
        if (!body.url) {
          throw new Error(body.error ?? "URL de paiement manquante.");
        }
        window.location.href = body.url;
      } catch (e) {
        console.error("[pricing] checkout", e);
        alert(e instanceof Error ? e.message : "Erreur lors du paiement.");
      } finally {
        setLoadingPlan(null);
      }
    },
    []
  );

  const currentPlan = parseSubscriptionPlan(bizSub?.plan ?? null);
  const subscribed = bizSub ? hasActiveSubscription(bizSub) : false;

  const starterBullets = [
    "Réservations en ligne",
    "Agenda et calendrier",
    "Gestion des clients",
    "Page publique de réservation",
    "Emails transactionnels",
    "Toutes les fonctionnalités sauf la génération automatique de factures PDF",
  ];

  const proBullets = [
    "Tout le plan Starter",
    "Génération automatique de factures PDF (bientôt)",
    "Support prioritaire sur la facturation",
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-950 antialiased">
      <header className="border-b border-neutral-200/80 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandLogoLink brand={landingContent.brand} variant="header" />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-neutral-600 transition hover:text-neutral-950">
              Accueil
            </Link>
            {userId ? (
              <Link
                href="/dashboard/facturation"
                className="font-medium text-neutral-950 underline-offset-4 hover:underline"
              >
                Facturation
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-neutral-600 transition hover:text-neutral-950">
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <h1 className="text-center font-display text-3xl font-normal tracking-tight text-neutral-950 md:text-4xl">
          Choisis ton abonnement Waevon
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600">
          7 jours d&apos;essai gratuit sur chaque formule. Sans engagement, résiliable à tout moment depuis
          l&apos;espace facturation.
        </p>

        {canceled ? (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
            Paiement annulé. Tu peux reprendre quand tu veux.
          </p>
        ) : null}

        {!sessionReady ? (
          <p className="mt-16 text-center text-sm text-neutral-500">Chargement…</p>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
            <PlanCard
              badge="Idéal pour démarrer"
              badgeTone="neutral"
              name={PLAN_LABELS.starter}
              priceLabel={`${PLAN_MONTHLY_PRICE_CHF.starter} CHF / mois`}
              bullets={starterBullets}
              plan="starter"
              loading={loadingPlan === "starter"}
              onSubscribe={() => void startCheckout("starter")}
              userLoggedIn={Boolean(userId)}
              currentPlan={currentPlan}
              subscribed={subscribed}
            />
            <PlanCard
              badge="Le plus populaire"
              badgeTone="accent"
              name={PLAN_LABELS.pro}
              priceLabel={`${PLAN_MONTHLY_PRICE_CHF.pro} CHF / mois`}
              bullets={proBullets}
              plan="pro"
              loading={loadingPlan === "pro"}
              onSubscribe={() => void startCheckout("pro")}
              userLoggedIn={Boolean(userId)}
              currentPlan={currentPlan}
              subscribed={subscribed}
              highlight
            />
          </div>
        )}

        <p className="mt-12 text-center text-sm text-neutral-500">
          7 jours d&apos;essai gratuit, sans engagement, résiliable à tout moment.
        </p>
      </main>
    </div>
  );
}

function PlanCard({
  badge,
  badgeTone,
  name,
  priceLabel,
  bullets,
  plan,
  loading,
  onSubscribe,
  userLoggedIn,
  currentPlan,
  subscribed,
  highlight,
}: {
  badge: string;
  badgeTone: "neutral" | "accent";
  name: string;
  priceLabel: string;
  bullets: string[];
  plan: BillingPlanId;
  loading: boolean;
  onSubscribe: () => void;
  userLoggedIn: boolean;
  currentPlan: BillingPlanId | null;
  subscribed: boolean;
  highlight?: boolean;
}) {
  const isCurrent = subscribed && currentPlan === plan;
  const isOtherSubscribed = subscribed && currentPlan !== null && currentPlan !== plan;

  let ctaLabel = "Commencer l'essai gratuit";
  if (isCurrent) ctaLabel = "Plan actuel";
  else if (isOtherSubscribed) ctaLabel = plan === "pro" ? "Passer au plan Pro" : "Passer au plan Starter";

  const shell = highlight
    ? "relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-white/10 bg-neutral-950 p-8 text-white shadow-xl ring-1 ring-white/[0.06] sm:p-9"
    : "relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-neutral-200/80 bg-white p-8 shadow-lg ring-1 ring-neutral-950/[0.04] sm:p-9";

  const badgeClass =
    badgeTone === "accent"
      ? "bg-white/15 text-white ring-1 ring-white/20"
      : highlight
        ? "bg-white/10 text-white ring-1 ring-white/15"
        : "bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/80";

  const ctaBase =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

  const ctaClass = highlight
    ? `${ctaBase} bg-white text-neutral-950 hover:bg-neutral-100`
    : `${ctaBase} border-2 border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-950 hover:text-white`;

  return (
    <div className={shell}>
      <span
        className={`mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
      >
        {badge}
      </span>
      <h2 className={`font-display text-2xl font-normal ${highlight ? "text-white" : "text-neutral-950"}`}>
        {name}
      </h2>
      <p className={`mt-3 text-lg ${highlight ? "text-neutral-300" : "text-neutral-600"}`}>{priceLabel}</p>
      <ul
        className={`mt-8 flex-1 space-y-3 text-sm leading-relaxed ${highlight ? "text-neutral-200" : "text-neutral-600"}`}
      >
        {bullets.map((line, i) => (
          <li key={i} className="flex gap-3">
            <CheckIcon className={`mt-0.5 shrink-0 ${highlight ? "text-neutral-400" : "text-neutral-950"}`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        {userLoggedIn ? (
          <button
            type="button"
            className={ctaClass}
            disabled={isCurrent || loading}
            onClick={onSubscribe}
          >
            {loading ? "Redirection…" : ctaLabel}
          </button>
        ) : (
          <Link
            href="/signup"
            className={ctaClass}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
