"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Inv = { card_id: string; quantity: number };
type Card = { id: string; name: string; description: string; rarity: string };
type Match = {
  id: string;
  kickoff_at: string;
  home: { name: string | null } | null;
  away: { name: string | null } | null;
};
type Member = { user_id: string; profiles: { username: string | null } | null };

const TARGETED = new Set(["vol_score", "carton_rouge", "tacle_glisse"]);

type Props = {
  leagueId: string;
  inventory: Inv[];
  cards: Card[];
  matches: Match[];
  members: Member[];
};

export function CardsClient({ leagueId, inventory, cards, matches, members }: Props) {
  const router = useRouter();
  const owned = useMemo(
    () =>
      cards
        .map((c) => ({ ...c, quantity: inventory.find((i) => i.card_id === c.id)?.quantity ?? 0 }))
        .filter((c) => c.quantity > 0),
    [cards, inventory]
  );

  const [cardId, setCardId] = useState(owned[0]?.id ?? "");
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [targetUserId, setTargetUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const needsTarget = TARGETED.has(cardId);

  const submit = async () => {
    if (!cardId || !matchId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/cards/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId,
          cardId,
          matchId,
          targetUserId: needsTarget ? targetUserId : null,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({ tone: "error", message: j?.error ?? "Erreur." });
        return;
      }
      setFeedback({ tone: "success", message: "Carte jouée ✓" });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", message: "Erreur réseau." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          Mon inventaire
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCardId(c.id)}
              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                c.id === cardId
                  ? "border-violet-400/50 bg-gradient-to-br from-violet-500/15 to-blue-500/5 shadow-[0_15px_40px_-15px_rgba(168,85,247,0.45)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-white">{c.name}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                  ×{c.quantity}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/55">{c.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={`${ui.glassCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-white">Jouer ma carte</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label} htmlFor="card-match">Sur quel match</label>
            <select
              id="card-match"
              className={ui.input}
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
            >
              {matches.length === 0 ? (
                <option value="">— aucun match disponible —</option>
              ) : (
                matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.home?.name ?? "—"} vs {m.away?.name ?? "—"} ·{" "}
                    {new Date(m.kickoff_at).toLocaleString("fr-CH", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))
              )}
            </select>
          </div>
          {needsTarget ? (
            <div>
              <label className={ui.label} htmlFor="card-target">Cible</label>
              <select
                id="card-target"
                className={ui.input}
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              >
                <option value="">— Choisir une cible —</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.username ?? "—"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <p
            className={`rounded-xl border px-3 py-2 text-xs ${
              feedback.tone === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !matchId || !cardId || (needsTarget && !targetUserId)}
          className={`${ui.btnPrimary} w-full justify-center`}
        >
          {submitting ? "Activation…" : "Jouer cette carte"}
        </button>
        <p className="text-center text-[11px] text-white/40">
          Maximum 1 carte par joueur par match. Verrouillage au coup d&apos;envoi (sauf VAR).
        </p>
      </section>
    </div>
  );
}
