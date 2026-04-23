/**
 * Contenu landing — texte figé, ne pas reformuler ici.
 * Liens d'action uniquement (hrefs).
 */

export const landingContent = {
  brand: {
    name: "waevon",
    logo: {
      src: "/waevon-logo.png",
      alt: "waevon",
    },
  },

  header: {
    /** Ancres : ids #presentation et #tarifs sur la page */
    navLinks: [
      { label: "Présentation", href: "#presentation" },
      { label: "Formules", href: "/pricing" },
      { label: "Tarifs", href: "#tarifs" },
    ],
    login: { label: "Connexion", href: "/login" },
    cta: { label: "Créer un compte", href: "/signup" },
  },

  hero: {
    title: "Ton agenda se remplit tout seul.",
    subtitle:
      "Réservations en ligne, moins d'appels, tout est centralisé.\nTu gagnes du temps et ton activité tourne en continu.",
    cta: { label: "Créer un compte", href: "/signup" },
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

  scrollStory: {
    steps: [
      {
        title: "Tes clients réservent en ligne",
        text: "À tout moment, sans appeler",
      },
      {
        title: "Ton agenda se remplit automatiquement",
        text: "Même quand tu travailles ou que tu dors",
      },
      {
        title: "Tout est centralisé",
        text: "Tes rendez-vous et tes clients au même endroit",
      },
    ],
  },

  product: {
    title: "Un système pensé pour aller vite.",
    text: "Une page de réservation claire, un agenda simple, et tout fonctionne automatiquement.",
  },

  pricing: {
    title: "Choisis comment tu veux fonctionner.",
    billingNote: "Abonnement mensuel — paiement sécurisé via Stripe.",
    starter: {
      name: "Starter",
      price: "20.- / mois",
      bullets: ["Réservations en ligne", "Agenda simple", "Base clients"],
    },
    pro: {
      name: "Pro",
      price: "35.- / mois",
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
    cta: { label: "Créer un compte", href: "/signup" },
  },

  faq: {
    title: "Encore des questions ?\nOn a les réponses",
    subtitle: "Vous n'avez pas trouvé votre réponse ? Contactez-nous",
    items: [
      {
        question: "C’est quoi Waevon ?",
        answer:
          "Waevon est un outil simple qui permet à tes clients de réserver en ligne, sans t’appeler. Ton agenda se remplit automatiquement et tout est centralisé au même endroit.\n\nAprès chaque rendez-vous, Waevon peut envoyer automatiquement un email pour récolter des avis, et te permet aussi de réutiliser les données clients pour lancer des campagnes marketing.",
      },
      {
        question: "À qui s’adresse Waevon ?",
        answer: `Waevon est conçu pour tous les indépendants et professionnels qui prennent des rendez-vous.

Par exemple :

* coiffeurs / barbiers
* esthéticiennes / ongleries
* masseurs / thérapeutes
* coachs sportifs
* garages automobiles
* freelances
* consultants`,
      },
      {
        question: "Est-ce que mes clients doivent créer un compte ?",
        answer: "Non. Tes clients peuvent réserver en quelques secondes, sans créer de compte.",
      },
      {
        question: "Est-ce que je peux personnaliser ma page de réservation ?",
        answer: "Oui. Tu peux personnaliser tes services, tes prix, tes horaires et l’expérience client.",
      },
      {
        question: "Est-ce que Waevon remplace les appels ?",
        answer:
          "Waevon réduit fortement les appels, car tes clients peuvent réserver directement en ligne. Tu restes joignable, mais tu n’es plus dépendant du téléphone.",
      },
      {
        question: "Est-ce que je peux voir mes rendez-vous facilement ?",
        answer: "Oui. Tous tes rendez-vous sont regroupés dans un seul agenda simple et clair.",
      },
      {
        question: "Est-ce que je peux gérer mes clients ?",
        answer: "Oui. Waevon te permet de retrouver facilement tes clients et leur historique.",
      },
      {
        question: "Est-ce que Waevon fonctionne sur mobile ?",
        answer: "Oui. Waevon est optimisé pour mobile, autant pour toi que pour tes clients.",
      },
      {
        question: "Est-ce que je peux générer des factures ?",
        answer: "Oui (plan Pro). Les factures peuvent être générées automatiquement selon les prestations choisies.",
      },
      {
        question: "Comment fonctionne l’abonnement ?",
        answer:
          "Waevon est proposé en abonnement mensuel (Starter ou Pro). Après création de compte, tu actives ton abonnement depuis l’espace facturation ; le paiement est géré par Stripe.",
      },
    ],
  },

  footer: {
    /** Conservé pour compat ; la grille du footer utilise `columns`. */
    links: [] as ReadonlyArray<{ label: string; href: string }>,
    intro: "Une réservation en ligne, pensée pour ton activité.",
    secondaryIntro: "Crée ton compte et mets ta page en ligne en quelques minutes.",
    primaryCta: { label: "Créer un compte", href: "/signup" },
    secondaryCta: { label: "Connexion", href: "/login" },
    columns: [
      {
        title: "Explorer",
        links: [
          { label: "Présentation", href: "#presentation" },
          { label: "Tarifs", href: "#tarifs" },
          { label: "FAQ", href: "#faq" },
        ],
      },
      {
        title: "Légal",
        links: [
          { label: "Conditions d'utilisation", href: "/conditions-d-utilisation" },
          { label: "Politique de confidentialité", href: "/confidentialite" },
        ],
      },
    ],
    bottomTagline: "Waevon · réservations & clients au même endroit",
    localeLabel: "Français",
  },
} as const;

export type LandingContent = typeof landingContent;
