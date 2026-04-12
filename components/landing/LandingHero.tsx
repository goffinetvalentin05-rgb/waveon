"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { HeroBento } from "./HeroBento";
import { ScrollReveal } from "./ScrollReveal";
import { landingBtnPrimary, landingSection } from "./landing-tokens";

type LandingHeroProps = {
  content: LandingContent["hero"];
};

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className="relative pb-24 pt-20 sm:pb-28 sm:pt-24 md:flex md:min-h-[calc(100dvh-5rem)] md:flex-col md:justify-center md:pb-40 md:pt-28 lg:pt-36">
      <div className={`${landingSection} w-full`}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h1 className="text-balance font-display text-[2.35rem] font-normal leading-[1.08] tracking-[-0.02em] text-neutral-950 md:text-5xl lg:text-6xl">
              {content.title}
            </h1>
          </ScrollReveal>
          <ScrollReveal delayMs={45} className="block">
            <p className="mx-auto mt-8 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 sm:mt-10 md:mt-12 md:text-lg">
              {content.subtitle}
            </p>
          </ScrollReveal>
          <ScrollReveal delayMs={90} className="block">
            <div className="mt-10 flex justify-center sm:mt-11 md:mt-14">
              <Link href={content.cta.href} className={landingBtnPrimary}>
                {content.cta.label}
              </Link>
            </div>
          </ScrollReveal>
        </div>
        <ScrollReveal delayMs={130} className="relative mx-auto mt-14 w-full max-w-5xl sm:mt-16 md:mt-20 lg:mt-24">
          <HeroBento />
        </ScrollReveal>
      </div>
    </section>
  );
}
