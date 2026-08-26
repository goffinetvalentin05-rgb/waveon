"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconBolt,
  IconCheck,
  IconRotate,
  IconRotate2,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { ENGLISH_TYPE_LABELS, type EnglishEntry, type EnglishReviewAction } from "@/lib/english/types";

export function FlashcardSession() {
  const [cards, setCards] = useState<EnglishEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/english/entries?due=1&sort=old");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les cartes.");
      setCards(data.entries ?? []);
      setIndex(0);
      setFlipped(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les cartes.");
      setCards([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = cards?.length ?? 0;
  const current = cards && index < total ? cards[index] : null;
  const finished = cards !== null && total > 0 && index >= total;
  const empty = cards !== null && total === 0;

  const rate = async (action: EnglishReviewAction) => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/english/entries/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      // silencieux : on passe malgré tout à la carte suivante
    }
    setSubmitting(false);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 crm-animate-in">
      <div>
        <Link
          href="/personal/english"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-wo-muted transition hover:text-wo-accent"
        >
          <IconArrowLeft className="h-4 w-4" stroke={1.75} />
          English
        </Link>
        <h1 className={`${ui.h1} mt-1`}>Révision</h1>
      </div>

      {error ? <p className={ui.alertError}>{error}</p> : null}

      {cards === null ? (
        <p className="text-sm text-wo-dim">Chargement des cartes à réviser…</p>
      ) : empty ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-wo-text">Vous êtes à jour</p>
          <p className="max-w-sm text-sm text-wo-muted">
            Aucune carte à réviser pour aujourd&apos;hui. Revenez plus tard ou ajoutez du nouveau
            vocabulaire.
          </p>
          <Link href="/personal/english" className={`${ui.btnPrimary} mt-2`}>
            Retour à English
          </Link>
        </div>
      ) : finished ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-wo-text">Session terminée</p>
          <p className="max-w-sm text-sm text-wo-muted">
            Bravo, vous avez révisé {total} carte{total > 1 ? "s" : ""} aujourd&apos;hui.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className={ui.btnSecondary} onClick={() => void load()}>
              Vérifier à nouveau
            </button>
            <Link href="/personal/english" className={ui.btnPrimary}>
              Retour à English
            </Link>
          </div>
        </div>
      ) : current ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-wo-muted">
              <span>
                {index + 1} sur {total}
              </span>
              <span>{ENGLISH_TYPE_LABELS[current.type]}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-wo-hover">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(index / total) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`${ui.cardFeatured} flex min-h-[300px] w-full flex-col items-center justify-center gap-4 px-6 py-10 text-center sm:min-h-[340px]`}
          >
            {!flipped ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">
                  Anglais
                </p>
                <p className="text-2xl font-semibold tracking-tight text-wo-text sm:text-3xl">
                  {current.english_text}
                </p>
                {current.example_english ? (
                  <p className="max-w-sm text-sm italic text-wo-muted">
                    &ldquo;{current.example_english}&rdquo;
                  </p>
                ) : null}
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-wo-accent">
                  <IconRotate2 className="h-4 w-4" stroke={1.75} />
                  Voir la traduction
                </span>
              </>
            ) : (
              <>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">
                  Français
                </p>
                <p className="text-2xl font-semibold tracking-tight text-wo-text sm:text-3xl">
                  {current.french_translation}
                </p>
                {current.example_french ? (
                  <p className="max-w-sm text-sm italic text-wo-muted">
                    &ldquo;{current.example_french}&rdquo;
                  </p>
                ) : null}
                {current.personal_note ? (
                  <p className="max-w-sm rounded-[12px] bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                    {current.personal_note}
                  </p>
                ) : null}
              </>
            )}
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void rate("hard")}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <IconBolt className="h-4 w-4" stroke={1.75} />
              Difficile
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void rate("review")}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              <IconRotate className="h-4 w-4" stroke={1.75} />
              À revoir
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void rate("know")}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-wo-accent transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <IconCheck className="h-4 w-4" stroke={1.75} />
              Je connais
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
