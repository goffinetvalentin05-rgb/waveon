"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

function safeText(v: string | null): string {
  return (v ?? "").trim();
}

export default function CancelReservationClient() {
  const sp = useSearchParams();
  const reservationId = useMemo(() => safeText(sp.get("reservationId")), [sp]);
  const businessId = useMemo(() => safeText(sp.get("businessId")), [sp]);
  const token = useMemo(() => safeText(sp.get("token")), [sp]);

  const isValidLink = Boolean(reservationId && businessId && token);
  const [status, setStatus] = useState<Status>(() => (isValidLink ? "loading" : "error"));
  const [message, setMessage] = useState<string>(() => (isValidLink ? "" : "Lien d’annulation invalide."));

  useEffect(() => {
    if (!isValidLink) return;

    let cancelled = false;

    void fetch("/api/reservations/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, businessId, token }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Annulation impossible.");
        }
        if (cancelled) return;
        setStatus("success");
        setMessage("Votre rendez-vous a bien été annulé.");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Annulation impossible.");
      });

    return () => {
      cancelled = true;
    };
  }, [reservationId, businessId, token, isValidLink]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] px-4 py-20 text-neutral-900">
      <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/90 bg-white px-8 py-10 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
        <h1 className="text-lg font-semibold tracking-tight">
          {status === "loading" ? "Annulation en cours…" : "Annulation de rendez-vous"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {status === "loading" ? "Merci de patienter quelques secondes." : message}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200/90 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Retour au site
          </Link>
          {status === "error" ? (
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-900"
            >
              Accéder au dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

