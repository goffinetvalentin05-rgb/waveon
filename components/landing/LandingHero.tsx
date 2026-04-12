import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { HeroBento } from "./HeroBento";
import { landingBtnPrimary, landingSection } from "./landing-tokens";

type LandingHeroProps = {
  content: LandingContent["hero"];
};

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pb-24 pt-10 md:pb-32 md:pt-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(139,92,246,0.11),transparent_50%)]"
        aria-hidden
      />
      <div className={`${landingSection} relative`}>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-[2.35rem] font-normal leading-[1.08] tracking-[-0.02em] text-neutral-950 md:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="mx-auto mt-8 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 md:mt-10 md:text-lg">
            {content.subtitle}
          </p>
          <div className="mt-10 flex justify-center md:mt-12">
            <Link href={content.cta.href} className={landingBtnPrimary}>
              {content.cta.label}
            </Link>
          </div>
        </div>
        <div className="relative mx-auto mt-4 max-w-5xl">
          <HeroBento />
        </div>
      </div>
    </section>
  );
}
