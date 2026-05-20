import { IconSparkles } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const CARDS = [
  {
    id: "joker_x2",
    name: "Joker x2",
    desc: "Double les points sur un match choisi.",
    rarity: "Épique" as const,
    icon: "×2",
  },
  {
    id: "vol_score",
    name: "Vol de score",
    desc: "Copie le pronostic d'un autre joueur.",
    rarity: "Rare" as const,
    icon: "↺",
  },
  {
    id: "carton_rouge",
    name: "Carton rouge",
    desc: "Bloque un pote : il ne peut plus modifier son prono.",
    rarity: "Rare" as const,
    icon: "▮",
  },
  {
    id: "tacle_glisse",
    name: "Tacle glissé",
    desc: "Si tu fais mieux que ta cible, tu lui voles 2 points.",
    rarity: "Rare" as const,
    icon: "⚔",
  },
  {
    id: "var",
    name: "VAR",
    desc: "Modifie ton prono après le coup d'envoi (fenêtre limitée).",
    rarity: "Épique" as const,
    icon: "VAR",
  },
];

export function CardsShowcase() {
  return (
    <SectionShell id="cartes" halo="intense">
      <Reveal>
        <SectionTitle
          line1="Les cartes changent tout"
          line2After=" en ligue privée"
          icon={IconSparkles}
          subtitle="Sabotage, boost et retournements de situation — jamais sur le concours global."
        />
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.id} delayMs={i * 70}>
            <article
              className={`pc-lp-game-card pc-glass-card pc-glass-card-interactive ${
                c.rarity === "Épique" ? "epic" : "rare"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="pc-lp-game-card-icon">{c.icon}</span>
                <span className="pc-lp-rarity">{c.rarity}</span>
              </div>
              <h3 className="mt-5 font-[family-name:var(--pc-font-display)] text-lg font-bold text-white">
                {c.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--pc-muted)]">{c.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-lg text-center text-xs text-[var(--pc-muted)]">
        5 cartes à l&apos;entrée en ligue privée · 1 carte jouable par match · ligues privées uniquement
      </p>
    </SectionShell>
  );
}
