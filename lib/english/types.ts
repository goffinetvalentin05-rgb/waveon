export const ENGLISH_TYPES = ["word", "expression", "sentence"] as const;
export type EnglishType = (typeof ENGLISH_TYPES)[number];

export const ENGLISH_STATUSES = [
  "new",
  "learning",
  "known",
  "review",
  "archived",
] as const;
export type EnglishStatus = (typeof ENGLISH_STATUSES)[number];

export const ENGLISH_REVIEW_ACTIONS = ["know", "review", "hard"] as const;
export type EnglishReviewAction = (typeof ENGLISH_REVIEW_ACTIONS)[number];

export type EnglishEntry = {
  id: string;
  user_id: string;
  type: EnglishType;
  english_text: string;
  french_translation: string;
  example_english: string | null;
  example_french: string | null;
  category: string | null;
  personal_note: string | null;
  status: EnglishStatus;
  review_level: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnglishEntryInput = {
  type: EnglishType;
  english_text: string;
  french_translation: string;
  example_english?: string | null;
  example_french?: string | null;
  category?: string | null;
  personal_note?: string | null;
};

export type EnglishStats = {
  total: number;
  dueToday: number;
  known: number;
  review: number;
  streak?: number;
  progressToday?: number;
};

export const ENGLISH_TYPE_LABELS: Record<EnglishType, string> = {
  word: "Mot",
  expression: "Expression",
  sentence: "Phrase",
};

export const ENGLISH_STATUS_LABELS: Record<EnglishStatus, string> = {
  new: "Nouveau",
  learning: "En cours",
  known: "Connu",
  review: "À revoir",
  archived: "Archivé",
};
