import Link from "next/link";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-20 sm:pt-18 sm:pb-24 lg:pt-20 lg:pb-28">
      <div className="pc-section-halo pc-section-halo-intense" aria-hidden />
      <div className={`relative z-[1] ${landing.container}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <Reveal>
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <span className={landing.badge}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.8)]" />
                  Jeu de pronostics entre potes — sans pari d&apos;argent
                </span>
              </div>
              <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
                La Coupe du monde arrive.{" "}
                <span className="block sm:inline">
                  Ton groupe WhatsApp{" "}
                  <span className="text-blue-400 drop-shadow-[0_0_28px_rgba(59,130,246,0.55)]">
                    n&apos;est pas prêt.
                  </span>
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#9ca3af] sm:text-base lg:mx-0">
                Pronostique les matchs, grimpe dans la ligue générale, crée ta ligue privée
                et joue des cartes d&apos;attaque pour saboter tes potes pendant tout le tournoi.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
                <Link href="/signup?next=create-league" className={landing.btnPrimaryLg}>
                  Créer ma ligue
                  <svg width="18" height="18" viewBox="0 0 24 24" className="ml-2" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link href="/signup" className={landing.btnSecondary}>
                  Rejoindre la ligue gratuite
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-[#9ca3af] lg:justify-start">
                <Trust label="Lien WhatsApp en 1 clic" />
                <Trust label="Mobile-first" />
                <Trust label="Concours gratuit · lot jusqu'à CHF 120" />
              </div>
            </div>
          </Reveal>
          <Reveal delayMs={120} className="flex justify-center lg:justify-end">
            <div className="origin-center scale-[0.72] sm:scale-[0.85] lg:scale-100">
              <PhoneMockup />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Trust({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-blue-400">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
