import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "Créez une campagne",
    body: [
      "Le commerçant crée une campagne depuis son compte Waevon et choisit son objectif, par exemple obtenir plus d’avis Google.",
    ],
  },
  {
    number: "02",
    title: "Diffusez le QR code en point de vente",
    body: [
      "Waevon génère un QR code lié à la campagne.",
      "Il peut être imprimé et placé sur les tables, au comptoir ou sur un support adapté.",
      "Un support graphique personnalisé peut également être conçu pour s’intégrer à l’image du commerce.",
    ],
  },
  {
    number: "03",
    title: "Configurez et suivez depuis le dashboard",
    body: [
      "Depuis le tableau de bord, le commerçant définit les règles de l’expérience : contenus, probabilités et paramètres.",
      "Il suit ensuite l’évolution de sa campagne en temps réel.",
    ],
  },
  {
    number: "04",
    title: "Automatisez la gestion des avis",
    body: [
      "Lorsqu’un client laisse un avis, Waevon peut automatiquement y répondre grâce à l’intelligence artificielle, sans action manuelle du commerçant.",
    ],
  },
];

const controlPoints = [
  "Avec Waevon, le commerçant garde toujours le contrôle.",
  "Il définit précisément ce qu’il souhaite obtenir et ce qu’il est prêt à proposer.",
  "Les règles de participation, les probabilités et les objectifs sont configurés à l’avance.",
  "Chaque campagne fonctionne dans un cadre clair, sans surprise ni dérive.",
  "Le commerçant visualise l’ensemble de ses campagnes et leurs résultats depuis un tableau de bord unique.",
];

const testimonials = [
  {
    name: "Claire Martin",
    role: "Gérante, Le Bistrot du Marché",
    quote:
      "Waevon nous a permis de récolter des avis beaucoup plus facilement.\nLes clients satisfaits participent naturellement et apprécient aussi d’avoir un retour en échange.\nC’est gagnant pour eux comme pour nous.",
  },
  {
    name: "Karim Benali",
    role: "Responsable, Urban Burger",
    quote:
      "Avant, on avait du mal à obtenir des avis.\nAvec Waevon, les clients jouent le jeu pour laisser un avis ou s’abonner sur nos réseaux.\nC’est simple à expliquer et bien accepté.",
  },
  {
    name: "Sophie Laurent",
    role: "Fondatrice, Studio Coiffure",
    quote:
      "Les clients sont contents de participer à l’expérience après leur passage.\nDe notre côté, ça nous aide à améliorer notre visibilité sans forcer personne.\nTout se gère facilement.",
  },
];

const faqs = [
  {
    question: "Est-ce que Waevon force les clients à laisser un avis ?",
    answer:
      "Non.\nLe client reste libre de participer ou non.\nWaevon propose une expérience, jamais une obligation.",
  },
  {
    question: "Est-ce que les clients acceptent facilement le principe ?",
    answer:
      "Oui.\nL’échange est clair et transparent.\nLes clients comprennent ce qu’ils font et ce qu’ils obtiennent en retour.",
  },
  {
    question: "Est-ce que je garde le contrôle sur mes campagnes ?",
    answer:
      "Oui, totalement.\nLe commerçant définit les règles, les paramètres et les objectifs de chaque campagne depuis son tableau de bord.",
  },
  {
    question: "Est-ce que ça demande du temps au quotidien ?",
    answer:
      "Non.\nUne fois la campagne mise en place, tout est automatisé.\nLe suivi se fait simplement depuis le dashboard.",
  },
  {
    question: "Que se passe-t-il avec les avis laissés par les clients ?",
    answer:
      "Waevon peut gérer automatiquement les réponses aux avis grâce à l’intelligence artificielle.\nLe commerçant n’a rien à faire, sauf s’il souhaite intervenir.",
  },
];

const pricingPlans = [
  {
    name: "Mensuel",
    description: "Même offre, paiement mensuel.",
    price: "25 CHF / mois",
    features: [
      "Création et gestion de campagnes",
      "QR codes pour le point de vente",
      "Tableau de bord en temps réel",
      "Réponses automatiques aux avis",
      "Expériences personnalisées",
      "Support prioritaire",
    ],
    cta: "Choisir le mensuel",
    highlighted: false,
  },
  {
    name: "Annuel",
    description: "Même offre, plus avantageux.",
    price: "270 CHF / an",
    features: [
      "Création et gestion de campagnes",
      "QR codes pour le point de vente",
      "Tableau de bord en temps réel",
      "Réponses automatiques aux avis",
      "Expériences personnalisées",
      "Support prioritaire",
    ],
    cta: "Choisir l’annuel",
    highlighted: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0b16] text-slate-100">
      <section className="relative flex min-h-screen flex-col pb-24 pt-0">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_55%)]" />
          <div className="absolute -left-48 top-[-220px] h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_70%)] blur-[220px]" />
          <div className="absolute right-[-160px] top-10 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22),transparent_70%)] blur-[190px]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>
        <nav className="relative flex w-full items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur lg:px-16">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_waevon.png"
              alt="Waevon"
              width={160}
              height={44}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <a
              href="#faq"
              className="hidden rounded-full px-4 py-2 transition hover:text-white md:inline-flex"
            >
              FAQ
            </a>
            <a
              href="#tarif"
              className="hidden rounded-full px-4 py-2 transition hover:text-white md:inline-flex"
            >
              Tarif
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 shadow-[0_10px_28px_rgba(59,130,246,0.18)] transition hover:border-white/25 hover:text-white"
            >
              Se connecter
            </a>
          </div>
        </nav>
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 pb-16 pt-16 lg:px-16">
          <div className="relative w-full max-w-4xl py-10">
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              <div className="absolute -left-44 top-0 w-[210px] -rotate-6 rounded-2xl border border-white/10 bg-[#111224]/90 p-4 shadow-[0_25px_60px_rgba(79,70,229,0.3)] backdrop-blur">
                <p className="text-xs text-slate-400">Avis collectés</p>
                <p className="mt-2 text-2xl font-semibold text-white">1 052</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  +18% cette semaine
                </p>
              </div>
              <div className="absolute -right-40 top-4 w-[200px] rotate-3 rounded-2xl border border-white/10 bg-[#111224]/90 p-4 shadow-[0_25px_60px_rgba(79,70,229,0.3)] backdrop-blur">
                <p className="text-xs text-slate-400">Taux de conversion</p>
                <p className="mt-2 text-2xl font-semibold text-white">62%</p>
                <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-violet-400 to-blue-400" />
                </div>
              </div>
              <div className="absolute -left-24 bottom-0 w-[220px] rotate-2 rounded-2xl border border-white/10 bg-[#111224]/90 p-4 shadow-[0_25px_60px_rgba(79,70,229,0.3)] backdrop-blur">
                <p className="text-xs text-slate-400">Campagne active</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  128 participations cette semaine
                </p>
                <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-violet-400 to-blue-400" />
                </div>
              </div>
              <div className="absolute -right-24 bottom-4 w-[200px] -rotate-4 rounded-2xl border border-white/10 bg-[#111224]/90 p-4 shadow-[0_25px_60px_rgba(79,70,229,0.3)] backdrop-blur">
                <p className="text-xs text-slate-400">Objectif</p>
                <p className="mt-2 text-sm text-white">
                  Augmenter les avis Google avec IA de réponse
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <Image
                src="/logo_waevon.png"
                alt="Waevon"
                width={320}
                height={88}
                className="h-16 w-auto md:h-20"
                priority
              />
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-6xl">
                Transformez chaque client satisfait en preuve visible.
              </h1>
              <p className="mt-6 max-w-2xl text-base text-slate-300 md:text-lg">
                Waevon structure un échange simple et maîtrisé pour améliorer
                votre réputation en ligne, sans forcer vos clients.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="#cta"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(79,70,229,0.45)] transition hover:brightness-110"
                >
                  Demander une démo
                </a>
                <a
                  href="#solution"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/25"
                >
                  Voir comment ça marche
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="constat" className="px-6 py-20 lg:px-16">
        <div className="mx-auto w-full max-w-none space-y-10">
          <div className="space-y-3" />
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,18,26,0.9),rgba(29,21,56,0.85))] p-8 shadow-[0_24px_52px_rgba(79,70,229,0.25)]">
            <p className="text-lg leading-relaxed text-slate-200 md:text-xl">
              Nous avons constaté que la majorité des commerces ont des clients
              satisfaits, mais en ligne cette réalité se voit peu&nbsp;: peu d’avis
              sont laissés, les retours négatifs prennent plus de place, et
              l’image finale ne reflète pas le travail quotidien.
            </p>
            <p className="mt-4 text-sm text-slate-400">
              C’est ce décalage que Waevon corrige.
            </p>
          </div>
        </div>
      </section>

      <div className="relative mx-auto -mt-14 -mb-14 flex max-w-6xl items-center justify-center px-6 lg:px-16">
        <div className="relative flex h-40 w-6 items-center justify-center">
          <div className="absolute h-full w-px bg-gradient-to-b from-violet-500/0 via-violet-400/60 to-indigo-400/0" />
          <span className="inline-flex h-2 w-2 rounded-full bg-violet-300/80 shadow-[0_0_12px_rgba(139,92,246,0.7)]" />
        </div>
      </div>

      <section id="solution" className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-3" />
          <div className="px-2 md:px-6">
            <h3 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
              Waevon transforme la satisfaction en preuve visible.
            </h3>
            <p className="mt-4 text-base text-slate-200">
              Le client réalise une action utile pour le commerce, puis accède à
              une expérience encadrée et définie à l’avance. Rien n’est imposé :
              tout est clair, transparent et maîtrisé.
            </p>
          </div>
        </div>
      </section>

      <section id="comment" className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.3em] text-white md:text-xl">
              COMMENT ÇA MARCHE
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,18,26,0.95),rgba(29,21,56,0.95))] p-7 shadow-[0_20px_42px_rgba(79,70,229,0.25)]"
              >
                <p className="text-4xl font-semibold text-slate-400">
                  {step.number}
                </p>
                <p className="mt-4 text-lg font-semibold">{step.title}</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {step.body.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                {step.number === "04" && (
                  <span className="absolute bottom-0 right-8 translate-y-1/2 rounded-full border border-white/10 bg-[#121225] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    Nouveauté à venir
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="controle" className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.3em] text-white md:text-xl">
              GARDER LE CONTRÔLE
            </p>
          </div>
          <div className="grid gap-4">
            {controlPoints.map((point, index) => (
              <div
                key={point}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_14px_30px_rgba(79,70,229,0.25)]"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm text-slate-300">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avis" className="py-20">
        <div className="mx-auto w-full max-w-none space-y-10">
          <div className="px-6 text-center lg:px-16">
            <p className="text-lg font-bold uppercase tracking-[0.3em] text-white md:text-xl">
              AVIS / TÉMOIGNAGES
            </p>
          </div>
          <div className="overflow-hidden">
            <div className="testimonial-track">
              {[...testimonials, ...testimonials].map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="min-w-[280px] shrink-0 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(79,70,229,0.2)] md:min-w-[320px] lg:min-w-[360px]"
                >
                  <div className="space-y-3 text-sm text-slate-200">
                    {item.quote.split("\n").map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <div className="mt-6 text-xs text-slate-400">
                    {item.name} — {item.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.3em] text-white md:text-xl">
              FAQ
            </p>
          </div>
          <div className="grid gap-4">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-[22px] border border-white/10 bg-white/5 p-5 shadow-[0_14px_30px_rgba(79,70,229,0.25)]"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
                  {item.question}
                </summary>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {item.answer.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="tarif" className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
              TARIFS
            </p>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Un plan pour démarrer, un plan pour accélérer.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-[32px] border p-8 shadow-[0_24px_52px_rgba(79,70,229,0.2)] ${
                  plan.highlighted
                    ? "border-indigo-400/40 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 right-6 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    Recommandé
                  </span>
                )}
                <p className="text-lg font-semibold text-white">{plan.name}</p>
                <p className="mt-2 text-sm text-slate-300">{plan.description}</p>
                <p className="mt-4 text-2xl font-semibold text-white">
                  {plan.price}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "border border-white/15 bg-white/5 text-white/90 hover:border-white/30"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="cta"
        className="bg-[linear-gradient(180deg,rgba(11,12,20,0)_0%,rgba(11,12,20,1)_100%)] px-6 py-24 lg:px-16"
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">
            Faites enfin apparaître en ligne la satisfaction réelle de vos
            clients.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-slate-300 md:text-base">
            Découvrez comment Waevon peut s’intégrer simplement à votre
            activité.
          </p>
          <div className="mt-10">
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(79,70,229,0.45)] transition hover:brightness-110"
            >
              Demander une démo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
