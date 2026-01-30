/**
 * Internationalisation landing WaveOn (FR / EN / DE).
 * Pour ajouter une langue : étendre SupportedLocale et SUPPORTED_LOCALES dans types.ts,
 * créer le fichier locales/<code>.json sur le modèle de fr.json, et l’importer dans context.tsx.
 */
export { I18nProvider, useTranslation } from "./context";
export type { LandingTranslations } from "./context";
export {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "./types";
export type { SupportedLocale } from "./types";
