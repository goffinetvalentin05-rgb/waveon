"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import {
  ENGLISH_TYPES,
  ENGLISH_TYPE_LABELS,
  type EnglishEntry,
  type EnglishType,
} from "@/lib/english/types";

type FormValues = {
  type: EnglishType;
  english_text: string;
  french_translation: string;
  example_english: string;
  example_french: string;
  category: string;
  personal_note: string;
};

function toFormValues(entry: EnglishEntry | null): FormValues {
  if (!entry) {
    return {
      type: "word",
      english_text: "",
      french_translation: "",
      example_english: "",
      example_french: "",
      category: "",
      personal_note: "",
    };
  }
  return {
    type: entry.type,
    english_text: entry.english_text,
    french_translation: entry.french_translation,
    example_english: entry.example_english ?? "",
    example_french: entry.example_french ?? "",
    category: entry.category ?? "",
    personal_note: entry.personal_note ?? "",
  };
}

export function EnglishEntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: EnglishEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(entry));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(entry);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const english_text = values.english_text.trim();
    const french_translation = values.french_translation.trim();
    if (!english_text) {
      setError("Le texte anglais est obligatoire.");
      return;
    }
    if (!french_translation) {
      setError("La traduction est obligatoire.");
      return;
    }

    const body = {
      type: values.type,
      english_text,
      french_translation,
      example_english: values.example_english.trim() || null,
      example_french: values.example_french.trim() || null,
      category: values.category.trim() || null,
      personal_note: values.personal_note.trim() || null,
    };

    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/english/entries/${entry!.id}` : "/api/english/entries",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      setError("Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={ui.overlay}
        onClick={loading ? undefined : onClose}
        aria-label="Fermer"
      />
      <form
        onSubmit={submit}
        className={`${ui.modal} max-h-[90vh] max-w-lg overflow-y-auto p-6`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#eef6f2]">
            {isEdit ? "Modifier l'entrée" : "Ajouter une entrée"}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[#6b7d76] transition hover:bg-white/[0.06] hover:text-[#eef6f2]"
            onClick={onClose}
            aria-label="Fermer"
          >
            <IconX className="h-4 w-4" stroke={1.75} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className={ui.label}>Type</span>
            <div className="flex flex-wrap gap-2">
              {ENGLISH_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setField("type", t)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    values.type === t
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                      : "border-white/[0.08] bg-transparent text-[#8a9e96] hover:bg-white/[0.04]"
                  }`}
                >
                  {ENGLISH_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label} htmlFor="english_text">
                Anglais *
              </label>
              <input
                id="english_text"
                className={ui.input}
                value={values.english_text}
                onChange={(e) => setField("english_text", e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="french_translation">
                Français *
              </label>
              <input
                id="french_translation"
                className={ui.input}
                value={values.french_translation}
                onChange={(e) => setField("french_translation", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label} htmlFor="example_english">
                Exemple (anglais)
              </label>
              <textarea
                id="example_english"
                className={`${ui.input} min-h-[70px] resize-none`}
                value={values.example_english}
                onChange={(e) => setField("example_english", e.target.value)}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="example_french">
                Exemple (français)
              </label>
              <textarea
                id="example_french"
                className={`${ui.input} min-h-[70px] resize-none`}
                value={values.example_french}
                onChange={(e) => setField("example_french", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={ui.label} htmlFor="category">
              Catégorie
            </label>
            <input
              id="category"
              className={ui.input}
              placeholder="Ex. Travail, Voyage, Cuisine…"
              value={values.category}
              onChange={(e) => setField("category", e.target.value)}
            />
          </div>

          <div>
            <label className={ui.label} htmlFor="personal_note">
              Note personnelle
            </label>
            <textarea
              id="personal_note"
              className={`${ui.input} min-h-[70px] resize-none`}
              value={values.personal_note}
              onChange={(e) => setField("personal_note", e.target.value)}
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}
