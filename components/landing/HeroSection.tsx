import Link from "next/link";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-24 lg:min-h-[92vh] lg:pt-24 lg:pb-28">
      <div className="pc-section-halo pc-section-halo-intense" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[20%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]"
        aria-hidden
      />
      <div className={`relative z-[1] ${landing.container}`}>
        <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <Reveal>
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <span className={landing.badge}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.9)]" />
                  Jeu de pronostics entre potes — sans pari d&apos;argent
                </span>
              </div>

              <h1 className="pc-section-heading mt-8">
                <span className="block text-white">La Coupe du monde arrive.</span>
                <span className="mt-2 block text-white/95">
                  Ton groupe WhatsApp{" "}
                  <span className="text-blue-400 drop-shadow-[0_0_32px_rgba(59,130,246,0.5)]">
                    n&apos;est pas prêt.
                  </span>
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-[#9ca3af] sm:text-base lg:mx-0">
                Pronostique les matchs, grimpe dans la ligue générale, crée ta ligue privée
                et joue des cartes d&apos;attaque pour saboter tes potes pendant tout le tournoi.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
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

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[#9ca3af] lg:justify-start">
                <Trust label="Lien WhatsApp en 1 clic" />
                <Trust label="Mobile-first" />
                <Trust label="Concours · lot CHF 120" />
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={120} className="relative flex justify-center lg:justify-end">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.25)_0%,transparent_55%)]" />
            <div className="relative origin-center scale-[0.7] sm:scale-[0.82] lg:scale-100">
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
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label}
    </span>
  );
}
