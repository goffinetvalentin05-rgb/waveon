"use client";

import type { LandingContent } from "@/lib/landing/config";
import { PhoneBookingMockup } from "./PhoneBookingMockup";
import { ScrollReveal } from "./ScrollReveal";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingScrollStoryProps = {
  content: LandingContent["scrollStory"];
};

export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;

  return (
    <section id="parcours" className={`scroll-mt-28 ${landingDivider} bg-white`}>
      <div className={`${landingSection} py-24 md:py-32 lg:py-36`}>
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:items-start md:gap-x-12 lg:gap-x-20 xl:gap-x-24">
          {/* Étapes (ordre 2 sur mobile pour passer après le téléphone) */}
          <div className="order-2 flex flex-col md:order-1">
            {steps.map((step) => (
              <ScrollReveal key={step.title}>
                <div className="flex min-h-[min(46vh,360px)] flex-col justify-center border-b border-neutral-100 py-12 last:border-b-0 last:pb-2 md:min-h-[min(50vh,420px)] md:py-16 lg:min-h-[min(48vh,460px)] lg:py-20">
                  <h3 className="max-w-md font-display text-2xl font-normal leading-tight tracking-tight text-neutral-950 md:text-3xl lg:text-[2.125rem]">
                    {step.title}
                  </h3>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-600 md:mt-6 md:text-lg">
                    {step.text}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Un seul téléphone : hero en haut sur mobile, sticky à droite sur desktop */}
          <div className="order-1 flex justify-center md:sticky md:top-28 md:order-2 md:self-start md:justify-center lg:top-32">
            <div className="w-full max-w-[360px] pb-2 pt-2 md:max-w-none md:py-10 lg:py-14">
              <PhoneBookingMockup hero />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
