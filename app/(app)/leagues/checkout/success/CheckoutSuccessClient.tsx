"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/pronoclash/ui/GlassPanel";
import { GradientButton } from "@/components/pronoclash/ui/GradientButton";
import { SecondaryButton } from "@/components/pronoclash/ui/SecondaryButton";

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
      const t = setTimeout(() => router.replace(`/leagues/${slug}`), 2200);
      return () => clearTimeout(t);
    }
    if (attempts >= 24) return;

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
      <GlassPanel glow="violet" className="pc-state-card pc-animate-in">
        <div className="pc-state-icon success" aria-hidden>
          ✓
        </div>
        <h1 className="pc-state-title">Ta ligue est prête</h1>
        <p className="pc-state-text">
          {name ? (
            <>
              <strong style={{ color: "var(--pc-text)" }}>{name}</strong> est active. Redirection
              vers ta ligue…
            </>
          ) : (
            "Ta ligue est active. Redirection…"
          )}
        </p>
        <div className="pc-state-actions">
          <Link href={`/leagues/${slug}`} className="pc-btn primary lg block">
            Ouvrir ma ligue
          </Link>
          <SecondaryButton href={`/leagues/${slug}/invite`} block>
            Inviter sur WhatsApp
          </SecondaryButton>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel glow="violet" className="pc-state-card pc-animate-in">
      <div className="pc-state-icon" aria-hidden>
        ⏳
      </div>
      <h1 className="pc-state-title">Paiement reçu</h1>
      <p className="pc-state-text">
        Activation de ta ligue en cours… Cette page se met à jour automatiquement dès que Stripe a
        confirmé le paiement.
      </p>
      <div className="pc-state-spinner" role="status" aria-label="Chargement" />
      <div className="pc-state-actions">
        <button
          type="button"
          className="pc-btn ghost block"
          onClick={() => window.location.reload()}
        >
          Recharger la page
        </button>
        <SecondaryButton href="/dashboard" block>
          Retour à l&apos;arène
        </SecondaryButton>
      </div>
    </GlassPanel>
  );
}
