import { IconSparkles } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const CARDS = [
  { id: "joker_x2", name: "Joker x2", desc: "Double les points sur un match. Tout. Y compris la honte.", rarity: "Épique" as const, icon: "×2" },
  { id: "vol_score", name: "Vol de score", desc: "Copie le pronostic d'un autre joueur. Pour le pire ou le meilleur.", rarity: "Rare" as const, icon: "↺" },
  { id: "carton_rouge", name: "Carton rouge", desc: "Bloque un pote : il ne peut plus modifier son prono.", rarity: "Rare" as const, icon: "▮" },
  { id: "tacle_glisse", name: "Tacle glissé", desc: "Si tu fais mieux que ta cible, tu lui voles 2 points.", rarity: "Rare" as const, icon: "⚔" },
  { id: "var", name: "VAR", desc: "Modifie ton prono après le coup d'envoi (jusqu'à la 15e).", rarity: "Épique" as const, icon: "⚑" },
  { id: "bus_gare", name: "Bus garé", desc: "Bonus massif si tu pronostiques un nul… qui finit nul.", rarity: "Commune" as const, icon: "🚌" },
];

const RARITY_GLOW = {
  Épique: "shadow-[0_0_60px_rgba(59,130,246,0.45)] group-hover:shadow-[0_0_90px_rgba(59,130,246,0.65)]",
  Rare: "shadow-[0_0_40px_rgba(59,130,246,0.28)] group-hover:shadow-[0_0_70px_rgba(59,130,246,0.45)]",
  Commune: "shadow-[0_0_24px_rgba(148,163,184,0.2)] group-hover:shadow-[0_0_40px_rgba(148,163,184,0.35)]",
};

const RARITY_BADGE = {
  Épique: "border-blue-400/40 bg-blue-500/20 text-blue-200",
  Rare: "border-blue-500/25 bg-blue-500/10 text-blue-300/90",
  Commune: "border-white/10 bg-white/5 text-[#9ca3af]",
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
          subtitle="Cartes disponibles uniquement en ligue privée — 5 cartes à l'entrée, 1 par match."
        />
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.id} delayMs={i * 80}>
            <article className="group [perspective:900px]">
              <div
                className={`${landing.glass} relative overflow-hidden p-6 transition-[transform,box-shadow] duration-300 will-change-transform group-hover:[transform:rotateY(8deg)_translateY(-4px)] ${RARITY_GLOW[c.rarity]}`}
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${
                    c.rarity === "Commune" ? "bg-slate-500/25" : "bg-blue-500/30"
                  }`}
                />
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500 to-blue-700 font-[family-name:var(--font-display)] text-base font-bold text-white">
                    {c.icon}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RARITY_BADGE[c.rarity]}`}>
                    {c.rarity}
                  </span>
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  {c.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">{c.desc}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-[#9ca3af]/70">
        + Hold-up, Outsider et d&apos;autres cartes à débloquer pendant le tournoi.
      </p>
    </SectionShell>
  );
}
