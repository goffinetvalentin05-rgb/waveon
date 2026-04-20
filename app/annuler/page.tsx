import { Suspense } from "react";
import CancelReservationClient from "./CancelReservationClient";

export default function CancelReservationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f7f5] px-4 py-20 text-neutral-900">
          <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/90 bg-white px-8 py-10 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
            <h1 className="text-lg font-semibold tracking-tight">Annulation en cours…</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">Merci de patienter quelques secondes.</p>
          </div>
        </div>
      }
    >
      <CancelReservationClient />
    </Suspense>
  );
}

