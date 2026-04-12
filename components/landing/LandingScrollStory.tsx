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
        <div className="mx-auto max-w-3xl space-y-20 md:space-y-28 lg:space-y-32">
          {steps.map((step, index) => {
            const reverse = index % 2 === 1;

            return (
              <ScrollReveal key={step.title}>
                <div
                  className={`flex flex-col gap-10 md:flex-row md:items-center md:gap-14 lg:gap-20 ${
                    reverse ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col justify-center md:min-h-[200px]">
                    <h3 className="font-display text-2xl font-normal leading-tight tracking-tight text-neutral-950 md:text-3xl lg:text-[2rem]">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-600 md:mt-5 md:text-lg">
                      {step.text}
                    </p>
                  </div>
                  <div className="flex flex-1 justify-center md:justify-center">
                    <div className="rounded-3xl border border-neutral-200/90 bg-[#fafafa] p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] md:p-8">
                      <PhoneBookingMockup />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
