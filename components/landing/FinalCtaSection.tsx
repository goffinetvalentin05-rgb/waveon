import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden pb-32 pt-24 sm:pb-40 sm:pt-28">
      <div className="pc-section-halo pc-section-halo-mega" aria-hidden />
      <div className={`relative z-[1] ${landing.container} text-center`}>
        <Reveal>
          <h2 className="pc-section-heading mx-auto max-w-4xl">
            <span className="block text-white">Arrête de juste regarder</span>
            <span className="mt-2 block">
              <span className="text-blue-400 drop-shadow-[0_0_32px_rgba(59,130,246,0.45)]">les matchs.</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-sm text-[#9ca3af] sm:text-base">
            Crée ta ligue et fais souffrir tes potes pendant tout le tournoi.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
