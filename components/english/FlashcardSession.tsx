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
          href="/english"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          <IconArrowLeft className="h-4 w-4" stroke={1.75} />
          Anglais
        </Link>
        <h1 className={`${ui.h1} mt-1`}>Révision</h1>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {cards === null ? (
        <p className="text-sm text-slate-400">Chargement des cartes à réviser…</p>
      ) : empty ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-slate-900">Vous êtes à jour !</p>
          <p className="max-w-sm text-sm text-slate-500">
            Aucune carte à réviser pour aujourd&apos;hui. Revenez plus tard ou ajoutez du nouveau
            vocabulaire.
          </p>
          <Link href="/english" className={`${ui.btnPrimary} mt-2`}>
            Retour à Anglais
          </Link>
        </div>
      ) : finished ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-slate-900">Session terminée</p>
          <p className="max-w-sm text-sm text-slate-500">
            Bravo, vous avez révisé {total} carte{total > 1 ? "s" : ""} aujourd&apos;hui.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className={ui.btnSecondary} onClick={() => void load()}>
              Vérifier à nouveau
            </button>
            <Link href="/english" className={ui.btnPrimary}>
              Retour à Anglais
            </Link>
          </div>
        </div>
      ) : current ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>
                {index + 1} sur {total}
              </span>
              <span>{ENGLISH_TYPE_LABELS[current.type]}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${(index / total) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`${ui.card} flex min-h-[280px] w-full flex-col items-center justify-center gap-4 px-6 py-10 text-center transition sm:min-h-[320px]`}
          >
            {!flipped ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Anglais</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {current.english_text}
                </p>
                {current.example_english ? (
                  <p className="max-w-sm text-sm italic text-slate-400">
                    &ldquo;{current.example_english}&rdquo;
                  </p>
                ) : null}
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
                  <IconRotate2 className="h-4 w-4" stroke={1.75} />
                  Voir la traduction
                </span>
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Français</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {current.french_translation}
                </p>
                {current.example_french ? (
                  <p className="max-w-sm text-sm italic text-slate-400">
                    &ldquo;{current.example_french}&rdquo;
                  </p>
                ) : null}
                {current.personal_note ? (
                  <p className="max-w-sm rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              <IconBolt className="h-4 w-4" stroke={1.75} />
              Difficile
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void rate("review")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <IconRotate className="h-4 w-4" stroke={1.75} />
              À revoir
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void rate("know")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
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
