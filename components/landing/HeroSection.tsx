import Link from "next/link";
import { IconArrowRight, IconTrophy } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { Reveal } from "@/components/landing/Reveal";
import { landing } from "@/components/landing/landing-styles";

const TRUST = [
  "Lien WhatsApp en 1 clic",
  "100 % mobile",
  "Concours gratuit · CHF 120",
] as const;

export function HeroSection() {
  return (
    <section className="pc-hero overflow-hidden">
      <div className="pc-hero-halo" aria-hidden />
      <div className="pc-hero-halo-floor" aria-hidden />

      <div className={`relative z-[1] ${landing.container}`}>
        <div className="pc-hero-grid">
          <Reveal>
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
              <span className="pc-hero-badge">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                Pronostics entre potes · zéro pari d&apos;argent
              </span>

              <h1 className="pc-hero-headline mt-7 text-white">
                <span className="block">Le terrain. La passion.</span>
                <span className="mt-2 block">
                  Et tes potes{" "}
                  <span className="pc-hero-accent">à humilier.</span>
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-[#9ca3af] lg:mx-0 lg:max-w-lg lg:text-base">
                Avec {brand.name}, pronostique les matchs, sabote tes potes avec des cartes
                et fais monter la pression dans ta ligue privée — le tout depuis WhatsApp.
              </p>

              <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <Link
                  href="/signup?next=create-league"
                  className={`${landing.btnPrimaryLg} group w-full justify-center sm:w-auto`}
                >
                  Créer ma ligue
                  <IconArrowRight
                    size={20}
                    stroke={2}
                    className="ml-2 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/signup"
                  className={`${landing.btnSecondary} w-full justify-center sm:w-auto`}
                >
                  Rejoindre la ligue gratuite
                </Link>
              </div>

              <div className="pc-hero-trust mt-8 justify-center lg:justify-start">
                {TRUST.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-[#9ca3af] sm:text-xs"
                  >
                    <span className="text-blue-400">✓</span>
                    {label}
                  </span>
                ))}
              </div>

              <Link
                href="#concours"
                className="mt-6 inline-flex items-center gap-2 text-sm text-[#9ca3af] transition hover:text-blue-300"
              >
                <IconTrophy size={16} className="text-amber-400/90" stroke={1.8} />
                Lot jusqu&apos;à CHF 120 pour le n°1 du classement général
                <span className="text-blue-400">→</span>
              </Link>
            </div>
          </Reveal>

          <Reveal delayMs={150} className="pc-hero-visual">
            <div className="pc-hero-ring hidden sm:block" aria-hidden />
            <div className="pc-hero-device-wrap">
              <PhoneMockup />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
