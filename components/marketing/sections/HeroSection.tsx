import Link from "next/link";
import { ui } from "@/lib/design/tokens";
import { HeroPhoneMockup } from "@/components/marketing/HeroPhoneMockup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
      <div className="pc-aurora" />
      <div className={ui.container}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <span className={`${ui.badgeAccent}`}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
                Jeu de pronostics entre potes — sans pari d'argent
              </span>
            </div>
            <h1 className={`${ui.h1} mt-5`}>
              La Coupe du monde arrive.{" "}
              <span className="pc-text-shine">Ton groupe WhatsApp</span> n'est pas prêt.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg lg:mx-0">
              Pronostique les matchs, grimpe dans la ligue générale, crée ta ligue privée
              et joue des cartes d&apos;attaque pour saboter tes potes pendant tout le tournoi.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
              <Link href="/signup?next=create-league" className={ui.btnPrimaryLg}>
                Créer ma ligue
                <svg width="18" height="18" viewBox="0 0 24 24" className="ml-2" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/signup" className={ui.btnSecondary}>
                Rejoindre la ligue gratuite
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/45 lg:justify-start">
              <Trust label="Lien WhatsApp en 1 clic" />
              <Trust label="Mobile-first" />
              <Trust label="Concours gratuit · lot jusqu'à CHF 120" />
            </div>
          </div>
          <div className="relative">
            <HeroPhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-emerald-400">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
