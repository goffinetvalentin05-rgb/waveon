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
  type BillingPlanId,
} from "@/lib/stripe/config";
import { buildWorkspaceAccessState } from "@/lib/subscription/workspace-access";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
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

function planLabel(plan: "starter" | "pro" | null): string {
  if (plan === "starter" || plan === "pro") return PLAN_LABELS[plan];
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
  const { ready, state, businessId } = useWavon();
  const searchParams = useSearchParams();
  const discoveryParam = searchParams.get("subscription_required") === "1";
  const canceledParam = searchParams.get("canceled") === "true";
  const [portalLoading, setPortalLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);

  const billing = useMemo(() => {
    if (!ready || !businessId) return null;
    const summary = state.workspaceAccess ?? {
      hasActiveSubscription: false,
      canUsePremiumFeatures: false,
    };
    return getBillingStatusFromAccess(
      buildWorkspaceAccessState(businessId, state.subscription, summary)
    );
  }, [ready, businessId, state.subscription, state.workspaceAccess]);

  const sub = state.subscription;
  const activePaying =
    billing?.publicStatus === "active" || billing?.publicStatus === "past_due";
  const isStripe = sub.accessSource === "stripe";
  const showPortal =
    Boolean(billing?.canManageBilling) &&
    isStripe &&
    sub.status !== "sync_error" &&
    (sub.status === "active" || sub.status === "past_due" || sub.status === "canceled");

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

  if (!ready || !billing) {
    return (
      <div className={`${wavonPage} py-10 text-sm text-neutral-500`}>Chargement…</div>
    );
  }

  const badgeClass =
    billing.publicStatus === "sync_error"
      ? "bg-violet-100 text-violet-950"
      : billing.publicStatus === "active"
        ? "bg-emerald-100 text-emerald-950"
        : billing.publicStatus === "past_due"
          ? "bg-red-100 text-red-950"
          : billing.publicStatus === "canceled"
            ? "bg-neutral-200 text-neutral-900"
            : "bg-amber-100 text-amber-950";

  const pricingBulletsStarter = [
    "Réservations en ligne",
    "Agenda et calendrier",
    "Page publique de réservation",
    "E-mails transactionnels",
  ];
  const pricingBulletsPro = ["Tout le plan Starter", "Factures PDF automatiques (bientôt)"];

  const needsPricing = !activePaying;
  const profileAccess = state.workspaceAccess?.profileAccess ?? null;
  const effective = state.workspaceAccess?.effective;
  const adminOrInternalBypass = Boolean(profileAccess || effective?.isAdmin);
  const showAdminInternalFacturation = effective?.isAdmin === true;

  const sectionClassDefault = "rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm";

  if (showAdminInternalFacturation) {
    return (
      <div className={`${wavonPage} space-y-8 py-6`}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Facturation</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Abonnement Waevon et paiements sécurisés via Stripe.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/95 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Plan Pro actif — accès admin interne</p>
          <p className="mt-2 leading-relaxed text-emerald-900/95">
            Toutes les fonctionnalités sont débloquées pour ce compte.
          </p>
        </div>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 text-sm text-neutral-700 shadow-sm">
          <h2 className="font-semibold text-neutral-950">Besoin d’aide ?</h2>
          <p className="mt-2">
            Écrivez-nous à{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-neutral-950 underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={`${wavonPage} space-y-8 py-6`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Facturation</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Abonnement Waevon et paiements sécurisés via Stripe.
        </p>
      </div>

      {profileAccess ? (
        <div className="rounded-xl border border-emerald-200/95 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">{profileAccess.displayLabel}</p>
          <p className="mt-2 leading-relaxed text-emerald-900/95">
            Accès Pro complet via ton profil Supabase (usage interne). Aucun paiement Stripe requis pour ce compte.
          </p>
        </div>
      ) : null}

      {billing.publicStatus === "sync_error" ? (
        <div className="rounded-xl border border-violet-200/95 bg-violet-50 px-4 py-4 text-sm text-violet-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">{billing.label}</p>
          <p className="mt-2 leading-relaxed text-violet-900/95">{billing.billingMessage}</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-950 hover:bg-violet-100"
            onClick={() => window.location.reload()}
          >
            Actualiser la page
          </button>
        </div>
      ) : null}

      {(discoveryParam && !activePaying && !adminOrInternalBypass) ||
      (!activePaying && !adminOrInternalBypass && billing.publicStatus === "inactive") ? (
        <div className="rounded-xl border border-amber-200/95 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm">
          <p className="text-base font-semibold tracking-tight">Débloquer Waevon</p>
          <p className="mt-2 leading-relaxed text-amber-950/95">
            Choisissez une offre pour utiliser pleinement l’agenda, les services, les clients et les
            réservations.
          </p>
        </div>
      ) : null}

      {canceledParam ? (
        <div className="rounded-xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.
        </div>
      ) : null}

      <section className={sectionClassDefault}>
        {activePaying ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-950">Mon abonnement</h2>
            <div className="mt-4 space-y-4 text-sm text-neutral-700">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                Abonnement actif
              </span>

              {billing.publicStatus === "active" ? (
                <div className="space-y-3">
                  <p>
                    Formule : <strong>{planLabel(billing.plan)}</strong>
                    {billing.plan === "starter" || billing.plan === "pro" ? (
                      <>
                        {" "}
                        ({PLAN_MONTHLY_PRICE_CHF[billing.plan]} CHF / mois)
                      </>
                    ) : null}
                  </p>
                  {billing.currentPeriodEnd ? (
                    <p>
                      Prochain renouvellement prévu le{" "}
                      <strong>{formatDateFr(billing.currentPeriodEnd)}</strong>.
                    </p>
                  ) : (
                    <p className="text-neutral-600">Prochaine échéance : information en cours de mise à jour.</p>
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

              {billing.publicStatus === "past_due" ? (
                <div className="space-y-3">
                  <p>{billing.billingMessage}</p>
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
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-neutral-950">Votre abonnement</h2>
            <p className="mt-2 text-sm text-neutral-600">{billing.billingMessage}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                {billing.label}
              </span>
            </div>
            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => document.getElementById("waevon-pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              Voir les offres
            </button>
          </>
        )}
      </section>

      {(needsPricing || billing.publicStatus === "canceled") && !adminOrInternalBypass ? (
        <section id="waevon-pricing" className="space-y-4 scroll-mt-8">
          <h2 className="text-lg font-semibold text-neutral-950">Choisir un abonnement</h2>
          <p className="text-sm text-neutral-600">
            Choisissez une offre pour débloquer toutes les fonctionnalités de Waevon.
          </p>
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
                {loadingPlan === "starter" ? "Redirection…" : "Choisir cette offre"}
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
                {loadingPlan === "pro" ? "Redirection…" : "Choisir cette offre"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 text-sm text-neutral-700 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Besoin d’aide ?</h2>
        <p className="mt-2">
          Écrivez-nous à{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-neutral-950 underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Sans abonnement actif, vous pouvez parcourir l’interface ; l’usage opérationnel complet est réservé
          aux comptes abonnés. Détails sur{" "}
          <Link href="/pricing" className="font-medium text-neutral-800 underline">
            la page tarifs
          </Link>
          .
        </p>
      </section>

      {discoveryParam && !activePaying && !adminOrInternalBypass ? (
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
