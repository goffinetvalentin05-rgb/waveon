import { IconRoute } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const STEPS = [
  { n: "01", title: "Inscris-toi gratuitement", text: "Pseudo, avatar, consentements. Tu rejoins la ligue générale." },
  { n: "02", title: "Rejoins la ligue générale", text: "Tous les inscrits jouent ensemble. Classement public, concours gratuit." },
  { n: "03", title: "Pronostique les matchs", text: "Score exact, vainqueur, nul, écart : des points avant chaque coup d'envoi." },
  { n: "04", title: "Gagne des points", text: "Grimpe au classement. Le n°1 à la fin remporte le lot du concours." },
  { n: "05", title: "Crée une ligue privée", text: "Paye une fois, invite tes potes par WhatsApp. Sabotage activé." },
  { n: "06", title: "Joue des cartes", text: "Joker x2, Vol de score, Carton rouge, VAR… fais basculer le classement." },
];

export function HowItWorksSection() {
  return (
    <SectionShell id="comment">
      <Reveal>
        <SectionTitle
          line1="Six étapes."
          line2Before=""
          line2After=" Zéro prise de tête."
          icon={IconRoute}
          subtitle="Inscription gratuite, concours sur le classement général, ligues privées pour le fun."
        />
      </Reveal>
      <Reveal delayMs={100}>
        <div className="relative mt-14">
          <div className="pc-steps-line hidden lg:block" aria-hidden />
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
            {STEPS.map((s, i) => (
              <article
                key={s.n}
                className={`${landing.glass} ${landing.glassHover} relative min-w-[200px] flex-shrink-0 snap-start p-5 lg:min-w-0`}
              >
                <span className="pointer-events-none absolute -right-1 -top-2 font-[family-name:var(--font-display)] text-5xl font-bold text-blue-500/15">
                  {s.n}
                </span>
                <span className="relative text-xs font-bold text-blue-400">{s.n}</span>
                <h3 className="relative mt-2 font-[family-name:var(--font-display)] text-sm font-semibold text-white">
                  {s.title}
                </h3>
                <p className="relative mt-2 text-xs leading-relaxed text-[#9ca3af]">{s.text}</p>
                {i < STEPS.length - 1 ? (
                  <span className="absolute -right-2 top-1/2 hidden h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.9)] lg:block" />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
