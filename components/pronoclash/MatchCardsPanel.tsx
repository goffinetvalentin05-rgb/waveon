"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD_MESSAGES, V1_CARD_IDS } from "@/lib/pronoclash/card-messages";
import { isPredictionLocked } from "@/lib/pronoclash/prediction-lock";

type Inv = { card_id: string; quantity: number };
type Card = { id: string; name: string; description: string };
type Member = { user_id: string; username: string | null };

const TARGETED = new Set(["vol_score", "carton_rouge", "tacle_glisse"]);

type Props = {
  leagueId: string;
  matchId: string;
  kickoffAt: string;
  lockedAt: string;
  matchStatus: string;
  inventory: Inv[];
  cards: Card[];
  members: Member[];
  playedOnMatch: boolean;
  currentUserId: string;
};

export function MatchCardsPanel({
  leagueId,
  matchId,
  kickoffAt,
  lockedAt,
  matchStatus,
  inventory,
  cards,
  members,
  playedOnMatch,
  currentUserId,
}: Props) {
  const router = useRouter();
  const owned = useMemo(
    () =>
      cards
        .filter((c) => V1_CARD_IDS.includes(c.id as (typeof V1_CARD_IDS)[number]))
        .map((c) => ({
          ...c,
          quantity: inventory.find((i) => i.card_id === c.id)?.quantity ?? 0,
        }))
        .filter((c) => c.quantity > 0),
    [cards, inventory]
  );

  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState(owned[0]?.id ?? "");
  const [targetUserId, setTargetUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(
    null
  );

  const matchLocked =
    matchStatus !== "scheduled" || isPredictionLocked(lockedAt, kickoffAt);
  const needsTarget = TARGETED.has(cardId);
  const noCards = owned.length === 0;

  if (playedOnMatch) {
    return (
      <p style={{ fontSize: 11, color: "var(--pc-muted)", marginTop: 8 }}>
        {CARD_MESSAGES.alreadyPlayed}
      </p>
    );
  }

  if (matchLocked) return null;

  const submit = async () => {
    if (!cardId) return;
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
      const j = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        setFeedback({ tone: "error", message: j?.error ?? "Erreur." });
        return;
      }
      setFeedback({ tone: "success", message: j?.message ?? CARD_MESSAGES.played });
      setOpen(false);
      router.refresh();
    } catch {
      setFeedback({ tone: "error", message: "Erreur réseau." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--pc-border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pc-muted)" }}>
          Cartes spéciales
        </span>
        {!noCards && !open ? (
          <button
            type="button"
            className="pc-btn"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setOpen(true)}
          >
            Jouer une carte
          </button>
        ) : null}
      </div>

      {noCards ? (
        <p style={{ fontSize: 11, color: "var(--pc-muted)", marginTop: 6 }}>
          Aucune carte restante
        </p>
      ) : null}

      {open && !noCards ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {owned.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCardId(c.id)}
                className="pc-btn"
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderColor: c.id === cardId ? "var(--pc-accent)" : undefined,
                }}
              >
                {c.name} ×{c.quantity}
              </button>
            ))}
          </div>
          {needsTarget ? (
            <select
              className="pc-input"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="">— Cible —</option>
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.username ?? "Joueur"}
                  </option>
                ))}
            </select>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="pc-btn primary"
              disabled={submitting || !cardId || (needsTarget && !targetUserId)}
              onClick={submit}
              style={{ flex: 1, fontSize: 12 }}
            >
              {submitting ? "…" : "Jouer"}
            </button>
            <button
              type="button"
              className="pc-btn"
              onClick={() => setOpen(false)}
              style={{ fontSize: 12 }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p
          style={{
            marginTop: 6,
            fontSize: 11,
            color: feedback.tone === "success" ? "#6ee7b7" : "#fca5a5",
          }}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
