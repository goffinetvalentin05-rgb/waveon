"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWavon } from "@/components/wavon/WavonProvider";
import { getSubscriptionState } from "@/lib/subscription/state";

/**
 * Bandeau persistent pendant l’essai Waevon (hors facturation).
 */
export default function TrialBanner() {
  const pathname = usePathname();
  const { ready, state } = useWavon();

  if (!ready || pathname === "/dashboard/facturation" || pathname?.startsWith("/dashboard/facturation/")) {
    return null;
  }

  const s = getSubscriptionState(state.subscription);
  if (s.kind !== "trialing") return null;

  const left =
    s.daysLeft <= 0 ? "moins d’un jour" : s.daysLeft === 1 ? "1 jour" : `${s.daysLeft} jours`;

  return (
    <div
      className="border-b border-emerald-200/90 bg-emerald-50 px-4 py-2.5 text-center text-sm text-emerald-950"
    >
      Essai gratuit en cours — Jour {s.currentDay} sur 7 (il te reste {left}).{" "}
      <Link href="/dashboard/facturation" className="font-semibold underline underline-offset-2">
        Découvre les abonnements
      </Link>
    </div>
  );
}
