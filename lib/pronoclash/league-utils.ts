/**
 * Utilitaires pour les ligues : génération de slug, invite code, etc.
 */

const SLUG_ADJECTIVES = [
  "wild", "neon", "cosmic", "savage", "atomic", "lethal", "ghost",
  "tornado", "phantom", "dark", "lucky", "epic", "rocket", "stealth",
  "thunder", "rebel", "blast", "alpha", "nova", "fury",
];

const SLUG_NOUNS = [
  "lions", "tigers", "ninjas", "phoenix", "tacles", "saboteurs",
  "predators", "comets", "kings", "rebels", "panthers", "vipers",
  "dragons", "warriors", "outsiders", "underdogs", "snipers", "rockets",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLeagueSlug(): string {
  const adj = pick(SLUG_ADJECTIVES);
  const noun = pick(SLUG_NOUNS);
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}-${noun}-${num}`;
}

export function generateInviteCode(length = 8): string {
  // Évite les caractères ambigus (0/O/1/I/l)
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alpha[Math.floor(Math.random() * alpha.length)];
  }
  return out;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Message WhatsApp prérempli pour inviter à une ligue.
 */
export function buildWhatsappInviteMessage(args: {
  leagueName: string;
  inviteUrl: string;
}): string {
  return (
    `J'ai créé notre ligue Prono Clash pour le tournoi mondial de foot 2026. ` +
    `Viens pronostiquer, jouer des cartes et saboter le groupe : ${args.inviteUrl}`
  );
}

export function buildWhatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
