/** Message affiché quand le match est verrouillé (coup d'envoi atteint). */
export const PREDICTION_LOCKED_MESSAGE =
  "Pronostic verrouillé, le match a déjà commencé.";

/** VAR V1 : modification possible jusqu'à 10 min avant le coup d'envoi. */
export const VAR_LOCK_MINUTES_BEFORE_KICKOFF = 10;

export type PredictionLockOptions = {
  /** Carte VAR jouée sur ce match dans cette ligue privée */
  varActive?: boolean;
};

/**
 * Instant de verrouillage effectif du pronostic.
 */
export function predictionLockTime(
  lockedAt: string | null | undefined,
  kickoffAt?: string | null | undefined,
  options?: PredictionLockOptions
): Date | null {
  if (options?.varActive && kickoffAt) {
    const kickoffMs = new Date(kickoffAt).getTime();
    return new Date(kickoffMs - VAR_LOCK_MINUTES_BEFORE_KICKOFF * 60_000);
  }
  const effectiveLock = lockedAt ?? kickoffAt;
  if (!effectiveLock) return null;
  return new Date(effectiveLock);
}

/**
 * Pronostic verrouillé dès l'heure effective (locked_at ou kickoff_at, ou VAR −10 min).
 */
export function isPredictionLocked(
  lockedAt: string | null | undefined,
  kickoffAt?: string | null | undefined,
  now: Date = new Date(),
  options?: PredictionLockOptions
): boolean {
  const lock = predictionLockTime(lockedAt, kickoffAt, options);
  if (!lock) return false;
  return lock.getTime() <= now.getTime();
}
