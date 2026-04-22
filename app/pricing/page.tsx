import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

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
