"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LeaguePlan, LeaguePlanId } from "@/lib/stripe/config";

export function NewLeagueForm({ plans }: { plans: LeaguePlan[] }) {
  const searchParams = useSearchParams();
  const initialPlan = ((): LeaguePlanId => {
    const raw = searchParams.get("plan");
    if (raw === "pro") return "pro";
    return "private";
  })();
  const canceled = searchParams.get("canceled") === "1";

  const [plan, setPlan] = useState<LeaguePlanId>(initialPlan);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Donne un nom à ta ligue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-league-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, league_name: name.trim() }),
      });
      const j = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !j?.url) {
        setError(j?.error ?? "Impossible de lancer le paiement.");
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="pc-form-card pc-glass">
      {canceled ? (
        <p className="pc-alert warn">
          Paiement annulé. Tu peux relancer la création de ligue quand tu veux.
        </p>
      ) : null}

      <div style={{ marginBottom: 20 }}>
        <label className="pc-label" htmlFor="league-name">
          Nom de la ligue
        </label>
        <input
          id="league-name"
          type="text"
          className="pc-input"
          placeholder="Les Sabotards"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        <p className="pc-footnote" style={{ textAlign: "left", marginTop: 8 }}>
          Visible par tes membres. Modifiable plus tard.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p className="pc-label">Plan</p>
        <div className="pc-plan-grid">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`pc-plan-card${plan === p.id ? " active" : ""}`}
              aria-pressed={plan === p.id}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="pc-plan-name">{p.name}</span>
                {p.highlight ? <span className="pc-plan-badge">Top</span> : null}
              </div>
              <div className="pc-plan-price">
                {p.priceChf.toFixed(2).replace(".00", ".-")}
                <span className="pc-plan-meta"> CHF · paiement unique</span>
              </div>
              <ul className="pc-plan-features">
                <li>• Jusqu&apos;à {p.maxPlayers} joueurs</li>
                {p.features.slice(1, 3).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="pc-alert error">{error}</p> : null}

      <button type="submit" disabled={loading} className="pc-btn primary lg block">
        {loading ? "Redirection vers Stripe…" : "Continuer vers le paiement"}
      </button>
      <p className="pc-footnote">
        Chaque pack crée <strong style={{ color: "#e2e8f0" }}>une seule</strong> ligue privée. Pour une
        2<sup>e</sup> ligue, un nouveau paiement est nécessaire.
        <br />
        Paiement sécurisé via Stripe Checkout.
      </p>
    </form>
  );
}
