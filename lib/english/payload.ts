import type { EnglishEntryInput, EnglishType } from "@/lib/english/types";
import { ENGLISH_TYPES } from "@/lib/english/types";

export function validateEnglishInput(body: unknown): {
  data?: EnglishEntryInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Corps de requête invalide" };
  }
  const b = body as Record<string, unknown>;
  const type = String(b.type ?? "");
  if (!ENGLISH_TYPES.includes(type as EnglishType)) {
    return { error: "Type invalide (mot, expression ou phrase)" };
  }
  const english_text = String(b.english_text ?? "").trim();
  const french_translation = String(b.french_translation ?? "").trim();
  if (!english_text) return { error: "Le texte anglais est obligatoire" };
  if (!french_translation) return { error: "La traduction est obligatoire" };

  const blank = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s || null;
  };

  return {
    data: {
      type: type as EnglishType,
      english_text,
      french_translation,
      example_english: blank(b.example_english),
      example_french: blank(b.example_french),
      category: blank(b.category),
      personal_note: blank(b.personal_note),
    },
  };
}
