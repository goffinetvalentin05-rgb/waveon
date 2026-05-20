"use client";

import { useState } from "react";
import { isLeaguePlanId, type LeaguePlanId } from "@/lib/stripe/config";
import { GradientButton } from "@/components/pronoclash/ui/GradientButton";

export function RetryPaymentButton({
  leagueId,
  plan,
  leagueName,
}: {
  leagueId: string;
  plan: string;
  leagueName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = async () => {
    if (!isLeaguePlanId(plan)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-league-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          plan: plan as LeaguePlanId,
          league_name: leagueName,
        }),
      });
      const j = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !j?.url) {
        setError(j?.error ?? "Impossible de relancer le paiement.");
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GradientButton type="button" onClick={retry} disabled={loading} block large>
        {loading ? "Redirection…" : "Réessayer le paiement"}
      </GradientButton>
      {error ? <p className="pc-alert error">{error}</p> : null}
    </>
  );
}
