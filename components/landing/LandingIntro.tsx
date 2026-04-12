"use client";

import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingIntroProps = {
  content: LandingContent["intro"];
};

export function LandingIntro({ content }: LandingIntroProps) {
  return (
    <section id="presentation" className={`scroll-mt-28 ${landingDivider}`}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <ScrollReveal>
          <div
            className={`${landingCard} mx-auto max-w-4xl px-6 py-11 sm:px-8 sm:py-12 md:px-14 md:py-16 lg:px-16 lg:py-20`}
          >
            <h2 className="text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
              {content.title}
            </h2>
            <p className="mx-auto mt-8 max-w-2xl whitespace-pre-line text-center text-base leading-relaxed text-neutral-600 sm:mt-10 md:mt-12 md:text-lg">
              {content.text}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
