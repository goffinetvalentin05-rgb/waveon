import { ui } from "@/lib/design/tokens";

const CARDS = [
  {
    id: "joker_x2",
    name: "Joker x2",
    desc: "Double les points sur un match. Tout. Y compris la honte.",
    rarity: "Épique",
    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
    icon: "×2",
  },
  {
    id: "vol_score",
    name: "Vol de score",
    desc: "Copie le pronostic d'un autre joueur. Pour le pire ou le meilleur.",
    rarity: "Rare",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    icon: "↺",
  },
  {
    id: "carton_rouge",
    name: "Carton rouge",
    desc: "Bloque un pote : il ne peut plus modifier son prono.",
    rarity: "Rare",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    icon: "▮",
  },
  {
    id: "tacle_glisse",
    name: "Tacle glissé",
    desc: "Si tu fais mieux que ta cible, tu lui voles 2 points. Crades.",
    rarity: "Rare",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: "⚔",
  },
  {
    id: "var",
    name: "VAR",
    desc: "Modifie ton prono après le coup d'envoi (jusqu'à la 15e).",
    rarity: "Épique",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    icon: "⚑",
  },
  {
    id: "bus_gare",
    name: "Bus garé",
    desc: "Bonus massif si tu pronostiques un match nul… qui finit nul.",
    rarity: "Commune",
    gradient: "from-slate-500 via-zinc-500 to-stone-500",
    icon: "🚌",
  },
];

export function CardsSection() {
  return (
    <section id="cartes" className={`${ui.section} relative`}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Les cartes changent tout
          </p>
          <h2 className={`${ui.h2} mt-3`}>
            Sabote, booste, retourne le score.
          </h2>
          <p className="mt-4 text-base text-white/60">
            Disponibles uniquement dans les ligues privées. Chaque joueur reçoit
            <span className="font-semibold text-white"> 5 cartes</span> à l'entrée.
            Maximum 1 carte par match.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${c.gradient} opacity-20 blur-2xl transition group-hover:opacity-35`}
              />
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} font-display text-base font-bold text-white shadow-[0_12px_30px_-10px_rgba(99,102,241,0.6)]`}
                >
                  {c.icon}
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  {c.rarity}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">
                {c.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{c.desc}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-white/40">
          + Hold-up, Outsider et d'autres cartes à débloquer pendant le tournoi.
        </p>
      </div>
    </section>
  );
}
