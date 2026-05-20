/** Messages utilisateur — cartes ligue privée V1 */
export const CARD_MESSAGES = {
  played: "Carte jouée",
  alreadyPlayed: "Tu as déjà joué une carte sur ce match",
  locked: "Pronostic verrouillé, le match a déjà commencé",
  privateOnly: "Cette carte est uniquement disponible en ligue privée",
  noCard: "Tu n'as plus cette carte",
  targetNoProno: "La cible n'a pas encore pronostiqué",
  cartonBlocked:
    "Carton rouge : tu ne peux plus modifier ton pronostic pour ce match dans cette ligue.",
  varSoon: "VAR — bientôt disponible",
} as const;

/** Cartes actives pour la V1 (pas d'aléatoire, pas de boutique). */
export const V1_CARD_IDS = [
  "joker_x2",
  "vol_score",
  "carton_rouge",
  "tacle_glisse",
  "var",
] as const;

export type V1CardId = (typeof V1_CARD_IDS)[number];

export const V1_STARTER_PACK: Record<V1CardId, number> = {
  joker_x2: 1,
  vol_score: 1,
  carton_rouge: 1,
  tacle_glisse: 1,
  var: 1,
};

export function isV1CardId(id: string): id is V1CardId {
  return (V1_CARD_IDS as readonly string[]).includes(id);
}
