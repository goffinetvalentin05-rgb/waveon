import {
  IconCards,
  IconRoute,
  IconTarget,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const STEPS = [
  {
    n: "01",
    title: "Rejoins la ligue générale",
    text: "Inscription gratuite : tu entres dans l’arène avec tous les joueurs.",
    icon: IconUsers,
  },
  {
    n: "02",
    title: "Pronostique les matchs",
    text: "Score exact, vainqueur, nul : des points avant chaque coup d’envoi.",
    icon: IconTarget,
  },
  {
    n: "03",
    title: "Crée ta ligue privée",
    text: "Un pack = une ligue. Invite tes potes par WhatsApp.",
    icon: IconTrophy,
  },
  {
    n: "04",
    title: "Joue des cartes contre tes potes",
    text: "Joker, vol de score, carton… uniquement en ligue privée.",
    icon: IconCards,
  },
  {
    n: "05",
    title: "Grimpe au classement",
    text: "Grimpe au classement général et tente de remporter le maillot du concours, ou domine ta ligue privée.",
    icon: IconRoute,
  },
];

export function HowItWorksSection() {
  return (
    <SectionShell id="comment">
      <Reveal>
        <SectionTitle
          line1="Comment ça marche"
          line2Accent="en cinq étapes"
          subtitle="De l’inscription gratuite au sabotage entre potes — sans prise de tête."
        />
      </Reveal>
      <Reveal delayMs={100}>
        <div className="pc-lp-steps-grid mt-14">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <article key={s.n} className={`${landing.glassHover} pc-lp-step-card`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="pc-lp-step-num">{s.n}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-indigo-500/15 text-indigo-300">
                    <Icon size={18} stroke={1.8} />
                  </span>
                </div>
                <h3 className="font-[family-name:var(--pc-font-display)] text-sm font-bold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--pc-muted)]">{s.text}</p>
              </article>
            );
          })}
        </div>
      </Reveal>
    </SectionShell>
  );
}
