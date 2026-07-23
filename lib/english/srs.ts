import type { EnglishReviewAction, EnglishStatus } from "@/lib/english/types";

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Répétition espacée simple.
 * - know → 7 / 14 / 30 jours selon le niveau
 * - review → 3 jours
 * - hard → 1 jour
 */
export function applyReviewAction(
  action: EnglishReviewAction,
  currentLevel: number,
  from: Date = new Date()
): {
  status: EnglishStatus;
  review_level: number;
  next_review_at: string;
  last_reviewed_at: string;
} {
  const now = from.toISOString();

  if (action === "hard") {
    return {
      status: "review",
      review_level: Math.max(0, currentLevel - 1),
      next_review_at: addDaysISO(from, 1),
      last_reviewed_at: now,
    };
  }

  if (action === "review") {
    return {
      status: "review",
      review_level: currentLevel,
      next_review_at: addDaysISO(from, 3),
      last_reviewed_at: now,
    };
  }

  // know
  const nextLevel = currentLevel + 1;
  const days = nextLevel <= 1 ? 7 : nextLevel === 2 ? 14 : 30;
  return {
    status: "known",
    review_level: nextLevel,
    next_review_at: addDaysISO(from, days),
    last_reviewed_at: now,
  };
}

export function todayDateISO(timezone = "Europe/Zurich"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
