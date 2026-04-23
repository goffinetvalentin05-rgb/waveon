"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWavon } from "@/components/wavon/WavonProvider";
import { getSubscriptionState } from "@/lib/subscription/state";

/**
 * Bandeau essai (Waevon ou période d’essai Stripe) — hors page facturation.
 */
export default function TrialBanner() {
  const pathname = usePathname();
  const { ready, state } = useWavon();

  if (!ready || pathname === "/dashboard/facturation" || pathname?.startsWith("/dashboard/facturation/")) {
    return null;
  }

  const s = getSubscriptionState(state.subscription);
  if (s.kind !== "trialing" && s.kind !== "stripe_trialing") return null;

  const daysLeft = s.kind === "trialing" ? s.daysLeft : s.daysLeft;
  const left =
    daysLeft <= 0 ? "moins d’un jour" : daysLeft === 1 ? "1 jour" : `${daysLeft} jours`;

  const urgent = daysLeft <= 3 && daysLeft >= 0;
  const lastDay = daysLeft <= 1;

  const stripeTrial = s.kind === "stripe_trialing";

  const boxClass = lastDay
    ? "border-b border-rose-200/95 bg-rose-50 text-rose-950"
    : urgent
      ? "border-b border-amber-200/95 bg-amber-50 text-amber-950"
      : "border-b border-emerald-200/90 bg-emerald-50 text-emerald-950";

  const line1 = stripeTrial
    ? lastDay
      ? "Dernier jour de votre essai inclus — choisissez une formule pour éviter toute interruption."
      : urgent
        ? "Votre essai inclus se termine bientôt."
        : `Essai inclus : il vous reste ${left} pour tester Waevon.`
    : lastDay
      ? "Dernier jour d’essai gratuit — choisissez une formule pour éviter l’interruption."
      : urgent
        ? "Votre essai gratuit se termine bientôt."
        : `Essai gratuit : plus que ${left} pour tester Waevon.`;

  const line2 =
    stripeTrial || s.kind !== "trialing" ? null : `Jour ${s.currentDay} sur 7.`;

  return (
    <div className={`px-4 py-2.5 text-center text-sm ${boxClass}`}>
      <p className="font-medium tracking-tight">{line1}</p>
      {line2 ? <p className="mt-0.5 text-sm opacity-90">{line2}</p> : null}
      <p className="mt-1.5">
        <Link href="/dashboard/facturation" className="font-semibold underline underline-offset-2">
          Voir les abonnements
        </Link>
      </p>
    </div>
  );
}
