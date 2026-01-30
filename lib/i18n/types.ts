/**
 * Langues supportées sur la landing WaveOn.
 * Pour ajouter une langue :
 * 1. Étendre SupportedLocale et ajouter le code à SUPPORTED_LOCALES et LOCALE_LABELS
 * 2. Créer locales/<code>.json (copier fr.json et traduire)
 * 3. Dans context.tsx : importer le JSON et l’ajouter à l’objet translations
 */
export type SupportedLocale = "fr" | "en" | "de";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["fr", "en", "de"];

/** Langue par défaut si aucune préférence n'est enregistrée */
export const DEFAULT_LOCALE: SupportedLocale = "fr";

/** Clé localStorage pour persister la langue choisie */
export const LOCALE_STORAGE_KEY = "waevon_locale";

/** Labels courts pour l’UI du sélecteur (code langue) */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: "FR",
  en: "EN",
  de: "DE",
};
