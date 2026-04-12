import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { HeroBento } from "./HeroBento";
import { landingBtnPrimary, landingSection } from "./landing-tokens";

type LandingHeroProps = {
  content: LandingContent["hero"];
};

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className="relative pb-32 pt-24 sm:pt-28 md:flex md:min-h-[calc(100dvh-5rem)] md:flex-col md:justify-center md:pb-40 md:pt-28 lg:pt-36">
      <div className={`${landingSection} w-full`}>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-[2.35rem] font-normal leading-[1.08] tracking-[-0.02em] text-neutral-950 md:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="mx-auto mt-10 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 md:mt-12 md:text-lg">
            {content.subtitle}
          </p>
          <div className="mt-12 flex justify-center md:mt-14">
            <Link href={content.cta.href} className={landingBtnPrimary}>
              {content.cta.label}
            </Link>
          </div>
        </div>
        <div className="relative mx-auto mt-16 w-full max-w-5xl md:mt-20 lg:mt-24">
          <HeroBento />
        </div>
      </div>
    </section>
  );
}
