"use client";

import { useState } from "react";
import { isLeaguePlanId, type LeaguePlanId } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";

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
      <button
        type="button"
        onClick={retry}
        disabled={loading}
        className={`${ui.btnPrimary} w-full justify-center`}
      >
        {loading ? "Redirection…" : "Réessayer le paiement"}
      </button>
      {error ? (
        <p className="text-xs text-rose-300">{error}</p>
      ) : null}
    </>
  );
}
