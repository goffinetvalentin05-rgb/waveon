/** Textes joueur — concours maillot (ligue générale). */

export const CONTEST_PRIVATE_LEAGUES_GOAL = 10;

export const CONTEST_COPY = {
  title: "Maillot à gagner",
  main: "Termine 1er de la ligue générale et tente de remporter le maillot de ton choix.",
  unlockCondition:
    "Le prix sera débloqué si 10 ligues privées sont créées sur Waevon.",
  disclaimer: "Maillot soumis à disponibilité. Aucun échange en argent possible.",
  communityBadge: "Objectif communauté",
  /** Compteur global non exposé aux joueurs (RLS) — objectif statique pour l’instant. */
  communityGoal: "Objectif : 10 ligues privées créées",
} as const;
