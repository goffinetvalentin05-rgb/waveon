/**
 * Contenu landing — texte figé, ne pas reformuler ici.
 * Liens d'action uniquement (hrefs).
 */

export const landingContent = {
  brand: {
    name: "waevon",
    logo: {
      src: "/logo_waevon.png",
      alt: "waevon",
    },
  },

  header: {
    cta: { label: "Commencer gratuitement", href: "/signup" },
  },

  hero: {
    title: "Ton agenda se remplit tout seul.",
    subtitle:
      "Réservations en ligne, moins d'appels, tout est centralisé.\nTu gagnes du temps et ton activité tourne en continu.",
    cta: { label: "Commencer gratuitement", href: "/signup" },
  },

  intro: {
    title: "Un nouveau standard pour gérer tes rendez-vous.",
    text: "Aujourd'hui, tes clients veulent réserver simplement, sans appeler.\nWaevon te permet de passer à un système moderne, fluide et automatique.",
  },

  daily: {
    title: "Plus simple, au quotidien.",
    blocks: [
      {
        title: "Moins d'appels",
        detail: "→ tes clients réservent directement en ligne",
      },
      {
        title: "Tout est centralisé",
        detail: "→ tes rendez-vous, tes clients, ton activité",
      },
      {
        title: "Plus de réservations",
        detail: "→ ton agenda reste ouvert en permanence",
      },
    ],
  },

  product: {
    title: "Un système pensé pour aller vite.",
    text: "Une page de réservation claire, un agenda simple, et tout fonctionne automatiquement.",
  },

  pricing: {
    title: "Choisis comment tu veux fonctionner.",
    starter: {
      name: "Starter",
      price: "19.- / mois",
      bullets: ["Réservations en ligne", "Agenda simple", "Base clients"],
    },
    pro: {
      name: "Pro",
      price: "29.- / mois",
      bullets: [
        "Tout dans Starter",
        "Factures générées automatiquement\n  → selon chaque prestation",
      ],
    },
  },

  brandImage: {
    title: "Une image plus professionnelle.",
    text: "Tu proposes une expérience moderne à tes clients,\nsimple, rapide et efficace.",
  },

  finalCta: {
    title: "Passe à un système simple.",
    cta: { label: "Essayer gratuitement", href: "/signup" },
  },

  footer: {
    links: [] as ReadonlyArray<{ label: string; href: string }>,
  },
} as const;

export type LandingContent = typeof landingContent;
