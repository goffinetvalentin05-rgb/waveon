/** Message affiché quand le match est verrouillé (coup d'envoi atteint). */
export const PREDICTION_LOCKED_MESSAGE =
  "Pronostic verrouillé, le match a déjà commencé.";

/**
 * Pronostic verrouillé dès locked_at (ou kickoff_at si locked_at absent).
 * Cartes bonus : pour l'instant aucune exception (ligue générale toujours strict).
 */
export function isPredictionLocked(
  lockedAt: string | null | undefined,
  kickoffAt?: string | null | undefined,
  now: Date = new Date()
): boolean {
  const effectiveLock = lockedAt ?? kickoffAt;
  if (!effectiveLock) return false;
  return new Date(effectiveLock).getTime() <= now.getTime();
}
