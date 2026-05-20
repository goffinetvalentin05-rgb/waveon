import { IconFlame } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

// TODO: remplacer par vrais témoignages après bêta
const TESTIMONIALS = [
  {
    quote:
      "On a enfin un truc plus fun qu'un tableur Excel pour nos pronos. Les cartes ont déclenché une guerre civile dans le groupe.",
    role: "Beta tester · groupe de 8",
  },
  {
    quote:
      "Le lien WhatsApp, c'est ce qui a tout débloqué. Même ceux qui ne voulaient pas télécharger une app ont joué.",
    role: "Beta tester · groupe de 12",
  },
  {
    quote:
      "Pronostiquer depuis le métro sans galérer, et voir le classement bouger après chaque match — on est accros.",
    role: "Beta tester · groupe de 6",
  },
];

export function TestimonialsSection() {
  return (
    <SectionShell>
      <Reveal>
        <SectionTitle
          line1="Ce que disent les groupes"
          line2Before=""
          line2After=" qui ont testé"
          icon={IconFlame}
          subtitle="Retours de la bêta — exemples en attendant les vrais témoignages."
        />
      </Reveal>
      <div className="mt-14 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={i} delayMs={i * 100} className="min-w-[85%] flex-shrink-0 snap-center sm:min-w-[320px] md:min-w-0">
            <blockquote className={`${landing.glass} ${landing.glassHover} flex h-full flex-col p-6 sm:p-7`}>
              <p className="flex-1 text-sm leading-relaxed text-white/85 sm:text-base">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-white/[0.06] pt-4 text-sm text-[#9ca3af]">
                — {t.role}
              </footer>
            </blockquote>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
