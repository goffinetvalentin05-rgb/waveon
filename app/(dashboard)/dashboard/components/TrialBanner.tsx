"use client";

import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { usePathname } from "next/navigation";
import { useWavon } from "@/components/wavon/WavonProvider";

/**
 * Bandeau J-3 → fin d’essai Waevon (sans carte), hors pages facturation.
 */
export default function TrialBanner() {
  const pathname = usePathname();
  const { ready, state } = useWavon();

  if (!ready || pathname === "/dashboard/facturation" || pathname?.startsWith("/dashboard/facturation/")) {
    return null;
  }

  const sub = state.subscription;
  if (sub.accessSource !== "waevon" || sub.status !== "trialing" || !sub.trialEndsAt) {
    return null;
  }

  let daysLeft = 0;
  try {
    daysLeft = differenceInCalendarDays(parseISO(sub.trialEndsAt), new Date());
  } catch {
    return null;
  }

  if (daysLeft < 0 || daysLeft > 3) {
    return null;
  }

  const label =
    daysLeft <= 0
      ? "Ton essai se termine aujourd’hui."
      : daysLeft === 1
        ? "Il te reste 1 jour d’essai."
        : `Il te reste ${daysLeft} jours d’essai.`;

  return (
    <div className="border-b border-amber-200/90 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
      {label}{" "}
      <Link href="/dashboard/facturation" className="font-semibold underline underline-offset-2">
        Découvre les abonnements
      </Link>
    </div>
  );
}
