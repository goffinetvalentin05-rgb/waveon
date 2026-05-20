/**
 * Tacle glissé V1 : vole jusqu'à 2 pts du score du match de la cible
 * (pas du total ligue), sans descendre sous 0 sur ce match.
 */
export function computeTacleSteal(
  authorMatchPoints: number,
  targetMatchPoints: number
): { stolen: number; authorDelta: number; targetDelta: number } {
  if (authorMatchPoints <= targetMatchPoints) {
    return { stolen: 0, authorDelta: 0, targetDelta: 0 };
  }
  const stolen = Math.min(2, targetMatchPoints);
  return { stolen, authorDelta: stolen, targetDelta: -stolen };
}
