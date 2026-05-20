import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { DashboardMockup } from "@/components/landing/DashboardMockup";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

export function HeroSection() {
  return (
    <section className="pc-lp-hero overflow-hidden">
      <div className={`relative z-[1] ${landing.container}`}>
        <div className="pc-lp-hero-grid">
          <Reveal>
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
              <span className={landing.badge}>
                <span className="pc-lp-eyebrow-dot" />
                Jeu de pronostics entre potes — sans pari d&apos;argent
              </span>

              <h1 className="pc-lp-hero-title mt-7 text-white">
                La Coupe du monde arrive.{" "}
                <span className="pc-lp-heading-accent">Ton groupe WhatsApp n&apos;est pas prêt.</span>
              </h1>

              <p className={`${landing.body} mx-auto mt-6 max-w-lg lg:mx-0`}>
                Pronostique les matchs, grimpe dans la ligue générale, crée ta ligue privée et joue
                des cartes d&apos;attaque pour saboter tes potes pendant tout le tournoi.
              </p>

              <div className="pc-lp-hero-actions lg:justify-start">
                <Link
                  href="/signup?next=create-league"
                  className={`${landing.btnPrimary} group w-full justify-center sm:w-auto`}
                >
                  Créer ma ligue
                  <IconArrowRight
                    size={18}
                    stroke={2}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <Link href="/signup" className={`${landing.btnSecondary} w-full justify-center sm:w-auto`}>
                  Rejoindre gratuitement
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={120} className="relative">
            <DashboardMockup />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
