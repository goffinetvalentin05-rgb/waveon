"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PLAN_LABELS, PLAN_MONTHLY_PRICE_CHF } from "@/lib/stripe/config";
import { hasActiveSubscription } from "@/lib/subscription/access";
import { wavonPage } from "@/lib/wavon/tokens";

const SUPPORT_EMAIL = "contact@waevon.com";

function formatDateFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return null;
  }
}

export default function FacturationClient() {
  const { ready, state } = useWavon();
  const [portalLoading, setPortalLoading] = useState(false);

  const sub = state.subscription;
  const access = { status: sub.status, plan: sub.plan };
  const active = hasActiveSubscription(access);
  const planLabel = sub.plan ? PLAN_LABELS[sub.plan] : null;
  const monthlyChf = sub.plan ? PLAN_MONTHLY_PRICE_CHF[sub.plan] : null;

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

  if (!ready) {
    return (
      <div className={`${wavonPage} py-10 text-sm text-neutral-500`}>Chargement…</div>
    );
  }

  const status = sub.status;
  const trialEnd = formatDateFr(sub.trialEndsAt);
  const periodEnd = formatDateFr(sub.currentPeriodEnd);

  return (
    <div className={`${wavonPage} space-y-8 py-6`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Facturation</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Abonnement Waevon et moyens de paiement (via Stripe).
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">Mon abonnement</h2>

        {status === "trialing" ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-900">
              Période d&apos;essai
            </span>
            <p>
              Plan actuel : <strong>{planLabel ?? "—"}</strong>
            </p>
            {trialEnd && monthlyChf != null ? (
              <p>
                Ton essai gratuit se termine le <strong>{trialEnd}</strong>. Après cette date, tu seras
                facturé <strong>{monthlyChf} CHF</strong> / mois.
              </p>
            ) : (
              <p>Ta période d&apos;essai est en cours.</p>
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

        {(status === "none" ||
          status === "canceled" ||
          status === "unpaid" ||
          status === "incomplete") &&
        !active ? (
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-800">
              Inactif
            </span>
            <p>Tu n&apos;as pas d&apos;abonnement actif pour le moment.</p>
            <Link
              href="/pricing"
              className="inline-flex rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Choisir un plan
            </Link>
          </div>
        ) : null}

        {active && sub.status !== "past_due" ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-950 shadow-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              {portalLoading ? "Ouverture…" : "Gérer mon abonnement"}
            </button>
          </div>
        ) : null}

        {status === "past_due" ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {portalLoading ? "Ouverture…" : "Mettre à jour mon moyen de paiement"}
            </button>
          </div>
        ) : null}
      </section>

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
          Les fonctionnalités « factures PDF automatiques » sont réservées au plan Pro — voir{" "}
          <Link href="/pricing" className="font-medium text-neutral-800 underline">
            les formules
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
