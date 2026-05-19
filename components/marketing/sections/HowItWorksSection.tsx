import { ui } from "@/lib/design/tokens";

const STEPS = [
  {
    n: "01",
    title: "Inscris-toi gratuitement",
    text: "Pseudo, avatar, consentements séparés. Tu rejoins automatiquement la ligue générale.",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    n: "02",
    title: "Rejoins la ligue générale",
    text: "Tous les inscrits jouent ensemble. Pronostics classiques, classement public, concours gratuit.",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    n: "03",
    title: "Pronostique les matchs",
    text: "Score exact, bon vainqueur, bon nul, bon écart : empoche des points avant chaque coup d'envoi.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    n: "04",
    title: "Gagne des points",
    text: "Grimpe au classement général. Le premier à la fin du tournoi remporte le lot du concours.",
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    n: "05",
    title: "Crée une ligue privée",
    text: "Paye une fois, invite tes potes par WhatsApp. Classement privé et mode jeu avancé.",
    accent: "from-pink-500 to-rose-500",
  },
  {
    n: "06",
    title: "Joue des cartes",
    text: "Joker x2, Vol de score, Carton rouge, Tacle, VAR… fais basculer le classement entre potes.",
    accent: "from-rose-500 to-orange-500",
  },
];

export function HowItWorksSection() {
  return (
    <section id="comment" className={ui.section}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
            Comment ça marche
          </p>
          <h2 className={`${ui.h2} mt-3`}>Six étapes. Zéro prise de tête.</h2>
          <p className="mt-4 text-base text-white/60">
            Inscription gratuite, concours sur le classement général, ligues privées pour le fun entre potes.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className={`${ui.glassCard} p-6`}>
                <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} font-display text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)]`}
              >
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
