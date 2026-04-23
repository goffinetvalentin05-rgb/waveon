"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { loadStripe } from "@stripe/stripe-js";
import { useWavon } from "@/components/wavon/WavonProvider";
import {
  PLAN_LABELS,
  PLAN_MONTHLY_PRICE_CHF,
  TRIAL_PLAN_LABEL,
  WAEVON_TRIAL_DAYS,
  type BillingPlanId,
} from "@/lib/stripe/config";
import { hasActiveSubscription } from "@/lib/subscription/access";
import { getBillingStatus } from "@/lib/subscription/billing-status";
import { getSubscriptionState } from "@/lib/subscription/state";
import { supabase } from "@/lib/supabase/client";
import { wavonPage } from "@/lib/wavon/tokens";

const SUPPORT_EMAIL = "contact@waevon.com";
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function statusBadgeLabel(billing: ReturnType<typeof getBillingStatus>): string {
  if (billing.isExpired) return "Accès expiré";
  if (billing.isTrial) return "Essai gratuit actif";
  if (billing.status === "past_due") return "Paiement en retard";
  if (billing.isActive && billing.accessSource === "stripe") return "Abonnement actif";
  if (billing.accessSource === "stripe" && billing.status === "canceled") return "Abonnement résilié";
  if (billing.accessSource === "stripe" && (billing.status === "unpaid" || billing.status === "incomplete"))
    return "Abonnement inactif";
  return "Statut indéterminé";
}

function planDisplayName(billing: ReturnType<typeof getBillingStatus>): string {
  if (billing.plan === "trial") return TRIAL_PLAN_LABEL;
  if (billing.plan === "starter" || billing.plan === "pro") return PLAN_LABELS[billing.plan];
  if (billing.accessSource === "stripe" && billing.isTrial) {
    return billing.plan ? PLAN_LABELS[billing.plan] : "Formule en cours de configuration";
  }
  return "—";
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
  const billing = useMemo(() => getBillingStatus(sub), [sub]);
  const ss = getSubscriptionState(sub);
  const access = { status: sub.status, plan: sub.plan };
  const activePaying = hasActiveSubscription(access);
  const isStripe = sub.accessSource === "stripe";
  const showExpiredWall = billing.isExpired || trialExpiredParam || expiredParam;
  const showPricing =
    billing.isExpired ||
    billing.isTrial ||
    (isStripe &&
      !activePaying &&
      (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete")) ||
    showExpiredWall;

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

  const badgeClass = billing.isExpired
    ? "bg-amber-100 text-amber-950"
    : billing.status === "past_due"
      ? "bg-red-100 text-red-950"
      : billing.isTrial
        ? "bg-sky-100 text-sky-950"
        : billing.isActive
          ? "bg-emerald-100 text-emerald-950"
          : "bg-neutral-200 text-neutral-900";

  const showPortal =
    isStripe &&
    sub.status !== "none" &&
    sub.status !== "trial_expired" &&
    (sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due" ||
      sub.status === "canceled" ||
      sub.status === "unpaid" ||
      sub.status === "incomplete");

  const renewalOrTrialEnd = billing.isTrial
    ? formatDateFr(billing.trialEndsAt)
    : formatDateFr(billing.currentPeriodEnd);

  const pricingBulletsStarter = [
    "Réservations en ligne",
    "Agenda et calendrier",
    "Page publique de réservation",
    "E-mails transactionnels",
  ];
  const pricingBulletsPro = ["Tout le plan Starter", "Factures PDF automatiques (bientôt)"];

  const paymentLine =
    billing.paymentMethodLabel ??
    (isStripe && billing.stripeCustomerId
      ? "Gérable depuis le portail Stripe (carte et facturation)."
      : isStripe
        ? "Les informations de paiement sont gérées dans votre espace Stripe."
        : "Aucun moyen de paiement enregistré tant que vous n’êtes pas abonné.");

  return (
    <div className={`${wavonPage} space-y-8 py-6`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Facturation</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Votre abonnement Waevon et vos paiements sécurisés via Stripe.
        </p>
      </div>

      {showExpiredWall ? (
        <div className="rounded-xl border border-amber-200/95 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Votre essai gratuit est terminé</p>
          <p className="mt-2 leading-relaxed text-amber-950/95">
            Choisissez un abonnement pour réactiver Waevon. Vos données (rendez-vous, clients, réglages)
            sont conservées.
          </p>
        </div>
      ) : null}

      {!showExpiredWall && billing.isTrial && billing.accessSource === "waevon" ? (
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Essai gratuit en cours</p>
          <p className="mt-2 leading-relaxed text-emerald-950/95">
            {billing.daysLeft <= 0 ? (
              <>Il vous reste <strong>moins d’un jour</strong> pour profiter de toutes les fonctionnalités.</>
            ) : billing.daysLeft === 1 ? (
              <>Il vous reste <strong>1 jour</strong> d’essai.</>
            ) : (
              <>
                Votre essai gratuit se termine dans <strong>{billing.daysLeft} jours</strong>.
              </>
            )}
          </p>
          {ss.kind === "trialing" ? (
            <p className="mt-1 text-emerald-950/85">
              Jour {ss.currentDay} sur {WAEVON_TRIAL_DAYS}.
            </p>
          ) : null}
        </div>
      ) : null}

      {!showExpiredWall && ss.kind === "stripe_trialing" ? (
        <div className="rounded-xl border border-sky-200/90 bg-sky-50 px-4 py-4 text-sm text-sky-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Période d’essai (offre payante)</p>
          <p className="mt-2 leading-relaxed">
            {billing.daysLeft <= 1 ? (
              <>Votre essai inclus se termine très bientôt — vérifiez la prochaine facturation.</>
            ) : (
              <>
                Il vous reste environ <strong>{billing.daysLeft}</strong> jour
                {billing.daysLeft > 1 ? "s" : ""} avant la première facturation.
              </>
            )}
          </p>
        </div>
      ) : null}

      {canceledParam ? (
        <div className="rounded-xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.
        </div>
      ) : null}

      {/* A — Mon abonnement */}
      <section className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">Mon abonnement</h2>
        <div className="mt-4 space-y-4 text-sm text-neutral-700">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
            {statusBadgeLabel(billing)}
          </span>

          {billing.isExpired || showExpiredWall ? (
            <div className="space-y-3">
              <p className="font-medium text-neutral-950">
                Votre essai gratuit est terminé. Pour continuer à utiliser Waevon, choisissez un
                abonnement.
              </p>
              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => {
                  document.getElementById("waevon-pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                S’abonner maintenant
              </button>
            </div>
          ) : null}

          {billing.isTrial && billing.accessSource === "waevon" && !showExpiredWall ? (
            <div className="space-y-3">
              <p>
                Votre essai se termine le <strong>{formatDateFr(billing.trialEndsAt)}</strong>
                {billing.daysLeft > 0 ? (
                  <>
                    {" "}
                    — il vous reste <strong>{billing.daysLeft}</strong> jour
                    {billing.daysLeft > 1 ? "s" : ""}.
                  </>
                ) : null}
              </p>
              <p className="text-neutral-600">
                Passez à une formule payante pour continuer à utiliser Waevon sans interruption.
              </p>
              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => {
                  document.getElementById("waevon-pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                Choisir un abonnement
              </button>
            </div>
          ) : null}

          {billing.isActive && !billing.isTrial ? (
            <div className="space-y-3">
              <p>
                Formule : <strong>{planDisplayName(billing)}</strong>
                {billing.plan === "starter" || billing.plan === "pro" ? (
                  <>
                    {" "}
                    ({PLAN_MONTHLY_PRICE_CHF[billing.plan]} CHF / mois)
                  </>
                ) : null}
              </p>
              {billing.currentPeriodEnd ? (
                <p>
                  Prochain renouvellement prévu le <strong>{formatDateFr(billing.currentPeriodEnd)}</strong>.
                </p>
              ) : (
                <p className="text-neutral-600">Date de renouvellement : en attente de synchronisation.</p>
              )}
              {sub.cancelAtPeriodEnd && billing.currentPeriodEnd ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950">
                  Votre abonnement est configuré pour se terminer le{" "}
                  <strong>{formatDateFr(billing.currentPeriodEnd)}</strong>. Vous pouvez annuler cette
                  résiliation depuis le portail Stripe.
                </p>
              ) : null}
              {showPortal ? (
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={portalLoading}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-950 shadow-sm hover:bg-neutral-50 disabled:opacity-60"
                >
                  {portalLoading ? "Ouverture…" : "Gérer mon abonnement"}
                </button>
              ) : null}
            </div>
          ) : null}

          {billing.status === "past_due" ? (
            <div className="space-y-3">
              <p>
                Votre dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement pour conserver
                l’accès à Waevon.
              </p>
              {showPortal ? (
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={portalLoading}
                  className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {portalLoading ? "Ouverture…" : "Mettre à jour mon moyen de paiement"}
                </button>
              ) : null}
            </div>
          ) : null}

          {isStripe && billing.isTrial && sub.status === "trialing" ? (
            <div className="space-y-2">
              <p>
                Plan : <strong>{planDisplayName(billing)}</strong>
              </p>
              {billing.trialEndsAt ? (
                <p>
                  Fin de l’essai inclus le <strong>{formatDateFr(billing.trialEndsAt)}</strong>.
                </p>
              ) : (
                <p className="text-neutral-600">Période d’essai en cours (dates en synchronisation).</p>
              )}
              {showPortal ? (
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={portalLoading}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-950 shadow-sm hover:bg-neutral-50 disabled:opacity-60"
                >
                  {portalLoading ? "Ouverture…" : "Gérer mon abonnement"}
                </button>
              ) : null}
            </div>
          ) : null}

          {isStripe && !activePaying && !billing.isTrial && !billing.isExpired ? (
            <div className="space-y-2">
              <p>Aucun abonnement Stripe actif n’est détecté pour le moment.</p>
              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => {
                  document.getElementById("waevon-pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                Choisir un abonnement
              </button>
            </div>
          ) : null}

          {sub.status === "none" && sub.accessSource === "none" ? (
            <p className="text-neutral-600">
              Impossible de déterminer votre statut. Rechargez la page ou contactez le support si le
              problème persiste.
            </p>
          ) : null}
        </div>
      </section>

      {/* B — Résumé */}
      <section className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">Résumé</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Statut affiché</dt>
            <dd className="mt-0.5 font-medium text-neutral-950">{statusBadgeLabel(billing)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Formule</dt>
            <dd className="mt-0.5 font-medium text-neutral-950">{planDisplayName(billing)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">
              {billing.isTrial ? "Fin de l’essai" : "Prochaine échéance"}
            </dt>
            <dd className="mt-0.5 font-medium text-neutral-950">{renewalOrTrialEnd}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Jours restants (essai)</dt>
            <dd className="mt-0.5 font-medium text-neutral-950">
              {billing.isTrial ? (billing.daysLeft <= 0 ? "Moins d’un jour" : String(billing.daysLeft)) : "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Paiement</dt>
            <dd className="mt-0.5 font-medium text-neutral-950">{paymentLine}</dd>
          </div>
        </dl>
      </section>

      {/* Offres */}
      {showPricing ? (
        <section id="waevon-pricing" className="space-y-4 scroll-mt-8">
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
              <p className="mt-2 text-lg text-neutral-300">{PLAN_MONTHLY_PRICE_CHF.pro} CHF / mois</p>
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
      ) : null}

      {/* C — Aide */}
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 text-sm text-neutral-700 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Besoin d’aide ?</h2>
        <p className="mt-2">
          Écrivez-nous à{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-neutral-950 underline">
            {SUPPORT_EMAIL}
          </a>
          . Nous répondons sous 1 à 2 jours ouvrés.
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Sans abonnement actif après la fin de l’essai, l’accès au tableau de bord (agenda, services,
          réservations) est suspendu ; la facturation et vos paramètres de compte restent accessibles pour
          vous réabonner. Détails des offres sur{" "}
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
