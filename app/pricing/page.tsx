import type { Metadata } from "next";
import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Tarifs — Waevon",
  description:
    "Abonnements Waevon : Starter 20 CHF/mois, Pro 35 CHF/mois. 7 jours d'essai gratuit, sans engagement.",
};

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-neutral-500">
          Chargement…
        </div>
      }
    >
      <PricingPageClient />
    </Suspense>
  );
}
