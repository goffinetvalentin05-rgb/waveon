"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LeaguePlan, LeaguePlanId } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";

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
    <form onSubmit={submit} className={`${ui.glassCard} space-y-6 p-6 sm:p-8`}>
      {canceled ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Paiement annulé. Tu peux relancer la création de ligue quand tu veux.
        </p>
      ) : null}

      <div>
        <label className={ui.label} htmlFor="league-name">Nom de la ligue</label>
        <input
          id="league-name"
          type="text"
          className={ui.input}
          placeholder="Les Sabotards"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        <p className="mt-1 text-xs text-white/40">Visible par tes membres. Modifiable plus tard.</p>
      </div>

      <div>
        <div className={`${ui.label} mb-3`}>Plan</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                plan === p.id
                  ? "border-violet-400/50 bg-gradient-to-br from-violet-500/10 to-blue-500/5 shadow-[0_15px_40px_-15px_rgba(168,85,247,0.45)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
              aria-pressed={plan === p.id}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-white">{p.name}</span>
                {p.highlight ? (
                  <span className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                    Top
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-white">
                  {p.priceChf.toFixed(2).replace(".00", ".-")}
                </span>
                <span className="text-xs text-white/40">CHF · paiement unique</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                <li>• Jusqu&apos;à {p.maxPlayers} joueurs</li>
                {p.features.slice(1, 3).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={`${ui.btnPrimaryLg} w-full justify-center`}>
        {loading ? "Redirection vers Stripe…" : "Continuer vers le paiement"}
      </button>
      <p className="text-center text-[11px] text-white/40">
        Chaque pack crée <strong className="text-white/60">une seule</strong> ligue privée.
        Pour une 2<sup>e</sup> ligue, un nouveau paiement est nécessaire.
        <br />
        Paiement sécurisé via Stripe Checkout.
      </p>
    </form>
  );
}
