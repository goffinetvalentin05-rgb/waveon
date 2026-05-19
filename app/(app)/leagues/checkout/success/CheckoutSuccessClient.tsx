"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Props = {
  sessionId: string;
  initialSlug: string | null;
  initialStatus: string | null;
  initialName: string | null;
};

export function CheckoutSuccessClient({
  sessionId,
  initialSlug,
  initialStatus,
  initialName,
}: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [status, setStatus] = useState(initialStatus);
  const [name, setName] = useState(initialName);
  const [attempts, setAttempts] = useState(0);

  const ready = status === "active" && slug;

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => router.replace(`/leagues/${slug}`), 2500);
      return () => clearTimeout(t);
    }
    if (attempts >= 12) return;

    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/stripe/checkout-status?session_id=${encodeURIComponent(sessionId)}`
      );
      const j = (await res.json().catch(() => null)) as {
        slug?: string;
        status?: string;
        name?: string;
      } | null;
      if (j?.slug) setSlug(j.slug);
      if (j?.status) setStatus(j.status);
      if (j?.name) setName(j.name);
      setAttempts((a) => a + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId, ready, slug, attempts, router]);

  if (ready) {
    return (
      <div className={`${ui.glowCard} p-8 text-center`}>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-white">Ta ligue est prête</h1>
        <p className="mt-2 text-sm text-white/65">
          <span className="font-semibold text-white">{name}</span> est active. Redirection…
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/leagues/${slug}`} className={ui.btnPrimary}>
            Ouvrir ma ligue
          </Link>
          <Link href={`/leagues/${slug}/invite`} className={ui.btnSecondary}>
            Inviter sur WhatsApp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${ui.glassCard} p-8 text-center`}>
      <h1 className="font-display text-2xl font-semibold text-white">Paiement reçu</h1>
      <p className="mt-3 text-sm text-white/65">
        Création de ta ligue en cours… Le webhook Stripe active ta ligue en quelques secondes.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
        <button type="button" onClick={() => window.location.reload()} className={ui.btnGhost}>
          Recharger la page
        </button>
        <Link href="/dashboard" className="text-xs text-white/50 hover:text-white/70">
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
