import { IconSparkles } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";

const CARDS = [
  { id: "joker_x2", name: "Joker x2", desc: "Double les points sur un match. Tout. Y compris la honte.", rarity: "Épique" as const, icon: "×2" },
  { id: "vol_score", name: "Vol de score", desc: "Copie le pronostic d'un autre joueur.", rarity: "Rare" as const, icon: "↺" },
  { id: "carton_rouge", name: "Carton rouge", desc: "Bloque un pote : il ne peut plus modifier son prono.", rarity: "Rare" as const, icon: "▮" },
  { id: "tacle_glisse", name: "Tacle glissé", desc: "Si tu fais mieux que ta cible, tu lui voles 2 points.", rarity: "Rare" as const, icon: "⚔" },
  { id: "var", name: "VAR", desc: "Modifie ton prono après le coup d'envoi (jusqu'à la 15e).", rarity: "Épique" as const, icon: "⚑" },
  { id: "bus_gare", name: "Bus garé", desc: "Bonus massif si tu pronostiques un nul… qui finit nul.", rarity: "Commune" as const, icon: "🚌" },
];

const RARITY_GLOW = {
  Épique: "hover:shadow-[0_0_90px_rgba(59,130,246,0.55)]",
  Rare: "hover:shadow-[0_0_70px_rgba(59,130,246,0.4)]",
  Commune: "hover:shadow-[0_0_50px_rgba(148,163,184,0.25)]",
};

export function CardsShowcase() {
  return (
    <SectionShell id="cartes" halo="intense">
      <Reveal>
        <SectionTitle
          line1="Sabote, booste,"
          line2Before=""
          line2After=" retourne le score."
          icon={IconSparkles}
          subtitle="Cartes en ligue privée uniquement — 5 à l'entrée, 1 par match."
        />
      </Reveal>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.id} delayMs={i * 80}>
            <article className="group [perspective:1000px]">
              <div
                className={`pc-glass-card pc-glass-card-interactive relative overflow-hidden p-6 ${RARITY_GLOW[c.rarity]} transition-[transform,box-shadow] duration-300 will-change-transform group-hover:[transform:rotateY(8deg)_translateY(-4px)]`}
              >
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl ${
                    c.rarity === "Commune" ? "bg-slate-500/20" : "bg-blue-500/35"
                  }`}
                />
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500 to-blue-700 font-[family-name:var(--font-display)] text-lg font-bold text-white shadow-[0_12px_32px_rgba(59,130,246,0.45)]">
                    {c.icon}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.rarity === "Commune"
                        ? "border-white/10 bg-white/5 text-[#9ca3af]"
                        : "border-blue-400/30 bg-blue-500/15 text-blue-200"
                    }`}
                  >
                    {c.rarity}
                  </span>
                </div>
                <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                  {c.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">{c.desc}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
