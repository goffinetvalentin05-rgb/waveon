import { ui } from "@/lib/design/tokens";

const STEPS = [
  {
    n: "01",
    title: "Crée ou rejoins une ligue",
    text: "Lance une ligue privée avec tes potes ou rejoins la ligue publique gratuite.",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    n: "02",
    title: "Pronostique les matchs",
    text: "Score exact, vainqueur, match nul : empoche des points avant chaque coup d'envoi.",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    n: "03",
    title: "Joue des cartes",
    text: "Joker x2, vol de score, carton rouge… Saboter, booster, surprendre, c'est la base.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    n: "04",
    title: "Grimpe au classement",
    text: "Chaque match compte. Termine premier de ta ligue et chambre tes potes.",
    accent: "from-fuchsia-500 to-pink-500",
  },
];

export function HowItWorksSection() {
  return (
    <section id="comment" className={`${ui.section}`}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
            Comment ça marche
          </p>
          <h2 className={`${ui.h2} mt-3`}>Quatre étapes. Aucun appel téléphonique.</h2>
          <p className="mt-4 text-base text-white/60">
            Pas de tuto de 20 minutes. Tu t'inscris, tu pronostiques, tu sabotes.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
