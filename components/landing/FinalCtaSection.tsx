import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden pb-28 pt-20 sm:pb-36 sm:pt-24">
      <div className="pc-section-halo pc-section-halo-mega" aria-hidden />
      <div className={`relative z-[1] ${landing.container} text-center`}>
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
            Arrête de juste regarder les matchs.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm text-[#9ca3af] sm:text-base">
            Crée ta ligue et fais souffrir tes potes pendant tout le tournoi.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup?next=create-league" className={landing.btnPrimaryLg}>
              Créer ma ligue
            </Link>
            <Link href="/signup" className={landing.btnSecondary}>
              Rejoindre la ligue gratuite
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
