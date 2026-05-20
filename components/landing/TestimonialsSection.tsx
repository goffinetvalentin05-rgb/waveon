import { IconFlame } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";

// TODO: remplacer par vrais témoignages après bêta
const TESTIMONIALS = [
  {
    quote:
      "On a enfin un truc plus fun qu'un tableur Excel pour nos pronos. Les cartes ont déclenché une guerre civile dans le groupe.",
    role: "Beta tester · groupe de 8",
    hue: "from-blue-500 to-blue-700",
  },
  {
    quote:
      "Le lien WhatsApp, c'est ce qui a tout débloqué. Même ceux qui ne voulaient pas télécharger une app ont joué.",
    role: "Beta tester · groupe de 12",
    hue: "from-blue-600 to-blue-800",
  },
  {
    quote:
      "Pronostiquer depuis le métro sans galérer, et voir le classement bouger après chaque match — on est accros.",
    role: "Beta tester · groupe de 6",
    hue: "from-blue-400 to-blue-600",
  },
];

export function TestimonialsSection() {
  return (
    <SectionShell halo="wide">
      <Reveal>
        <SectionTitle
          line1="Ce que disent les groupes"
          line2Before=""
          line2After=" qui ont testé"
          icon={IconFlame}
          subtitle="Retours de la bêta — en attente des vrais témoignages."
        />
      </Reveal>

      <div className="mt-16 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {TESTIMONIALS.map((t, i) => (
          <Reveal
            key={i}
            delayMs={i * 100}
            className="min-w-[min(100%,340px)] flex-shrink-0 snap-center md:min-w-0"
          >
            <blockquote className="pc-bento-card flex h-full min-h-[280px] flex-col p-6 sm:p-7">
              <p className="flex-1 text-[15px] leading-[1.7] text-white/90 sm:text-base">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.hue} text-xs font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]`}
                  aria-hidden
                >
                  β
                </div>
                <p className="text-sm text-[#9ca3af]">— {t.role}</p>
              </footer>
            </blockquote>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
