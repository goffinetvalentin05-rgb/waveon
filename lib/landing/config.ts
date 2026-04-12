/**
 * Landing — tout le texte et les liens au même endroit.
 * Modifie uniquement cet objet ; les composants ne contiennent pas de copie marketing.
 */

export const landingContent = {
  brand: {
    name: "waevon",
  },

  nav: {
    links: [
      { label: "Nav link", href: "#benefits" },
      { label: "Nav link", href: "#features" },
    ],
    login: { label: "Connexion", href: "/login" },
    cta: { label: "Primary CTA", href: "/signup" },
  },

  hero: {
    title: "Hero title",
    subtitle: "Hero subtitle — keep it short. One or two lines.",
    primaryCta: { label: "Primary CTA", href: "/signup" },
    secondaryCta: { label: "Secondary CTA", href: "#features" },
  },

  benefits: {
    sectionId: "benefits" as const,
    /** Laisser vide "" pour ne pas afficher de titre de section */
    sectionTitle: "",
    items: [
      { eyebrow: "01", title: "Benefit title", text: "Benefit text." },
      { eyebrow: "02", title: "Benefit title", text: "Benefit text." },
      { eyebrow: "03", title: "Benefit title", text: "Benefit text." },
    ],
  },

  features: {
    sectionId: "features" as const,
    sectionTitle: "",
    items: [
      {
        title: "Feature title",
        description: "Feature description — one line.",
      },
      {
        title: "Feature title",
        description: "Feature description — one line.",
      },
      {
        title: "Feature title",
        description: "Feature description — one line.",
      },
    ],
  },

  finalCta: {
    title: "Final CTA title",
    subtitle: "Optional short line under the title.",
    cta: { label: "Primary CTA", href: "/signup" },
  },

  footer: {
    note: "Footer note or legal line.",
    links: [
      { label: "Connexion", href: "/login" },
      { label: "Primary CTA", href: "/signup" },
    ],
  },
} as const;

export type LandingContent = typeof landingContent;
