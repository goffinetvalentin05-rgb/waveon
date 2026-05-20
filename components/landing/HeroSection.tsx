import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { HeroAnimation } from "@/components/landing/HeroAnimation";
import { landing } from "@/components/landing/landing-styles";

export function HeroSection() {
  return (
    <section className="pc-lp-hero overflow-hidden" aria-label="Accueil">
      <div className="pc-lp-hero-bg" aria-hidden>
        <div className="pc-lp-hero-spotlight" />
        <div className="pc-lp-hero-orb pc-lp-hero-orb-violet" />
        <div className="pc-lp-hero-orb pc-lp-hero-orb-orange" />
        <div className="pc-lp-hero-orb pc-lp-hero-orb-blue" />
      </div>

      <div className={`relative z-[1] ${landing.container}`}>
        <div className="pc-lp-hero-stack">
          <div className="pc-lp-hero-copy">
            <span className={`${landing.badge} pc-lp-hero-badge`}>
              <span className="pc-lp-eyebrow-dot" />
              Jeu de pronostics entre potes — sans pari d&apos;argent
            </span>

            <h1 className="pc-lp-hero-title">
              <span className="pc-lp-hero-title-line">La Coupe du monde arrive.</span>
              <span className="pc-lp-hero-title-accent">Ton groupe n&apos;est pas prêt.</span>
            </h1>

            <p className="pc-lp-hero-subtitle">
              Pronostique les matchs, crée ta ligue privée et défie tes potes avec des cartes
              d&apos;attaque — tout le tournoi, en direct.
            </p>

            <div className="pc-lp-hero-actions">
              <Link
                href="/signup?next=create-league"
                className={`${landing.btnPrimaryLg} pc-lp-btn-glow group`}
              >
                Créer ma ligue
                <IconArrowRight
                  size={18}
                  stroke={2}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
              <Link href="/signup" className={`${landing.btnSecondary} pc-lp-interactive lg`}>
                Rejoindre gratuitement
              </Link>
            </div>
          </div>

          <div className="pc-lp-hero-showcase">
            <HeroAnimation />
          </div>
        </div>
      </div>
    </section>
  );
}
