"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { loadStripe } from "@stripe/stripe-js";
import { useWavon } from "@/components/wavon/WavonProvider";
import {
  PLAN_LABELS,
  PLAN_MONTHLY_PRICE_CHF,
  WAEVON_TRIAL_DAYS,
  type BillingPlanId,
} from "@/lib/stripe/config";
import { hasActiveSubscription } from "@/lib/subscription/access";
import { billingAccessStateFromSnapshot, isBillingBlockedState } from "@/lib/subscription/billing-access";
import { supabase } from "@/lib/supabase/client";
import { wavonPage } from "@/lib/wavon/tokens";

const SUPPORT_EMAIL = "contact@waevon.com";
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

function formatDateFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return null;
  }
}

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

export default function FacturationClient() {
  const { ready, state } = useWavon();
  const searchParams = useSearchParams();
  const trialExpiredParam = searchParams.get("trial_expired") === "1";
  const expiredParam = searchParams.get("expired") === "true";
  const canceledParam = searchParams.get("canceled") === "true";
  const [portalLoading, setPortalLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);

  const sub = state.subscription;
  const access = { status: sub.status, plan: sub.plan };
  const active = hasActiveSubscription(access);
  const isWaevonTrial = sub.accessSource === "waevon" && sub.status === "trialing";
  const isTrialExpired = sub.status === "trial_expired";
  const isStripe = sub.accessSource === "stripe";
  const hardLocked = isBillingBlockedState(billingAccessStateFromSnapshot(sub));
  const showExpiredWall = hardLocked || trialExpiredParam;
  const showSubscriptionChoice =
    isWaevonTrial || isTrialExpired || hardLocked || trialExpiredParam || expiredParam;
  const planLabel = sub.plan ? PLAN_LABELS[sub.plan] : null;
  const monthlyChf = sub.plan ? PLAN_MONTHLY_PRICE_CHF[sub.plan] : null;

  let waevonDaysLeft: number | null = null;
  if (isWaevonTrial && sub.trialEndsAt) {
    try {
      waevonDaysLeft = differenceInCalendarDays(parseISO(sub.trialEndsAt), new Date());
    } catch {
      waevonDaysLeft = null;
    }
  }

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Portail indisponible.");
      if (!body.url) throw new Error("URL portail manquante.");
      window.location.href = body.url;
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erreur portail Stripe.");
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const startCheckout = useCallback(async (plan: BillingPlanId) => {
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
          throw new Error(`Réponse serveur invalide (${res.status}).`);
        }
      }
      if (!res.ok) {
        throw new Error(body.error ?? `Erreur serveur (${res.status}).`);
      }
      if (!body.url) throw new Error(body.error ?? "URL de paiement manquante.");
      window.location.href = body.url;
    } catch (e) {
      console.error("[facturation] checkout", e);
      alert(e instanceof Error ? e.message : "Erreur lors du paiement.");
    } finally {
      setLoadingPlan(null);
    }
  }, []);

  if (!ready) {
    return (
      <div className={`${wavonPage} py-10 text-sm text-neutral-500`}>Chargement…</div>
    );
  }

  const status = sub.status;
  const trialEnd = formatDateFr(sub.trialEndsAt);
  const periodEnd = formatDateFr(sub.currentPeriodEnd);

  const showPortal =
    isStripe &&
    sub.status !== "none" &&
    sub.status !== "trial_expired" &&
    (status === "active" ||
      status === "trialing" ||
      status === "past_due" ||
      status === "canceled" ||
      status === "unpaid" ||
      status === "incomplete");

  const pricingBulletsStarter = [
    "Réservations en ligne",
    "Agenda et calendrier",
    "Page publique de réservation",
    "Emails transactionnels",
  ];
  const pricingBulletsPro = ["Tout le plan Starter", "Factures PDF automatiques (bientôt)"];

  return (
    <div className={`${wavonPage} space-y-8 py-6`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Facturation</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Abonnement Waevon et moyens de paiement (via Stripe).
        </p>
      </div>

      {showExpiredWall ? (
        <div className="rounded-xl border border-red-300/90 bg-red-50 px-4 py-4 text-sm text-red-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Ton essai gratuit est terminé</p>
          <p className="mt-2 leading-relaxed text-red-900/95">
            Choisis un abonnement pour réactiver Waevon et retrouver tous tes rendez-vous, clients et
            réglages. Rien n&apos;est perdu, ton compte est sauvegardé.
          </p>
        </div>
      ) : null}

      {canceledParam ? (
        <div className="rounded-xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          Paiement annulé. Tu peux réessayer quand tu veux.
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">Mon abonnement</h2>

        {isWaevonTrial ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-900">
              Essai gratuit
            </span>
            <p>
              Tu es en période d&apos;essai ({WAEVON_TRIAL_DAYS} jours sans carte).{" "}
              {waevonDaysLeft != null && waevonDaysLeft >= 0 ? (
                <>
                  Il te reste{" "}
                  <strong>
                    {waevonDaysLeft === 0
                      ? "moins d’un jour"
                      : waevonDaysLeft === 1
                        ? "1 jour"
                        : `${waevonDaysLeft} jours`}
                  </strong>
                  .
                </>
              ) : trialEnd ? (
                <>
                  Fin prévue le <strong>{trialEnd}</strong>.
                </>
              ) : null}
            </p>
            <p className="text-neutral-600">
              Pour continuer après l&apos;essai, choisis un plan ci-dessous : paiement dès la souscription
              (sans nouvelle période d&apos;essai Stripe).
            </p>
          </div>
        ) : null}

        {isTrialExpired ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
              Essai terminé
            </span>
            <p className="font-medium text-neutral-950">
              Ton essai est terminé. Choisis un plan pour continuer à utiliser Waevon.
            </p>
          </div>
        ) : null}

        {isStripe && status === "trialing" ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-900">
              Période d&apos;essai (Stripe)
            </span>
            <p>
              Plan actuel : <strong>{planLabel ?? "—"}</strong>
            </p>
            {trialEnd && monthlyChf != null ? (
              <p>
                Prochaine facturation prévue après l&apos;essai le <strong>{trialEnd}</strong> (
                <strong>{monthlyChf} CHF</strong> / mois).
              </p>
            ) : (
              <p>Ta période d&apos;essai liée à l&apos;abonnement est en cours.</p>
            )}
          </div>
        ) : null}

        {status === "active" ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
              Actif
            </span>
            <p>
              Plan actuel : <strong>{planLabel ?? "—"}</strong>
            </p>
            {periodEnd && monthlyChf != null ? (
              <p>
                Prochaine facturation le <strong>{periodEnd}</strong> pour{" "}
                <strong>{monthlyChf} CHF</strong>.
              </p>
            ) : null}
            {sub.cancelAtPeriodEnd && periodEnd ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950">
                Ton abonnement sera résilié le <strong>{periodEnd}</strong>. Tu peux changer d&apos;avis
                jusqu&apos;à cette date depuis « Gérer mon abonnement ».
              </p>
            ) : null}
          </div>
        ) : null}

        {status === "past_due" ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-900">
              Paiement en retard
            </span>
            <p>
              Ton dernier paiement a échoué. Mets à jour ton moyen de paiement pour continuer à utiliser
              Waevon.
            </p>
          </div>
        ) : null}

        {(status === "none" || status === "canceled" || status === "unpaid" || status === "incomplete") &&
        isStripe &&
        !active ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-800">
              Inactif
            </span>
            <p>Pas d&apos;abonnement Stripe actif.</p>
          </div>
        ) : null}

        {showPortal ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className={
                status === "past_due"
                  ? "rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                  : "rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-950 shadow-sm hover:bg-neutral-50 disabled:opacity-60"
              }
            >
              {portalLoading
                ? "Ouverture…"
                : status === "past_due"
                  ? "Mettre à jour mon moyen de paiement"
                  : "Gérer mon abonnement"}
            </button>
          </div>
        ) : null}
      </section>

      {showSubscriptionChoice && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-950">Choisir un abonnement</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm">
              <h3 className="font-display text-xl text-neutral-950">{PLAN_LABELS.starter}</h3>
              <p className="mt-2 text-lg text-neutral-600">
                {PLAN_MONTHLY_PRICE_CHF.starter} CHF / mois
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                {pricingBulletsStarter.map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckIcon className="mt-0.5 shrink-0 text-neutral-950" />
                    {line}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => void startCheckout("starter")}
                className="mt-6 w-full rounded-full border-2 border-neutral-950 bg-white py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-950 hover:text-white disabled:opacity-60"
              >
                {loadingPlan === "starter" ? "Redirection…" : "Choisir Starter"}
              </button>
            </div>
            <div className="rounded-2xl border border-neutral-950 bg-neutral-950 p-6 text-white shadow-lg">
              <h3 className="font-display text-xl">{PLAN_LABELS.pro}</h3>
              <p className="mt-2 text-lg text-neutral-300">
                {PLAN_MONTHLY_PRICE_CHF.pro} CHF / mois
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-200">
                {pricingBulletsPro.map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckIcon className="mt-0.5 shrink-0 text-neutral-400" />
                    {line}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => void startCheckout("pro")}
                className="mt-6 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 disabled:opacity-60"
              >
                {loadingPlan === "pro" ? "Redirection…" : "Choisir Pro"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-6 text-sm text-neutral-700">
        <h2 className="font-semibold text-neutral-950">Besoin d&apos;aide ?</h2>
        <p className="mt-2">
          Écris-nous à{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-neutral-950 underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Les fonctionnalités « factures PDF automatiques » sont réservées au plan Pro — voir aussi{" "}
          <Link href="/pricing" className="font-medium text-neutral-800 underline">
            la page tarifs
          </Link>
          .
        </p>
      </section>

      {showExpiredWall || expiredParam ? (
        <div className="border-t border-neutral-200/90 pt-8 text-center">
          <button
            type="button"
            className="text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-950"
            onClick={() => {
              void supabase.auth.signOut().then(() => {
                window.location.href = "/login";
              });
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}
