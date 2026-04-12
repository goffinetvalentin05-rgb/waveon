"use client";

import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { VisualClientsCard } from "./VisualClientsCard";
import { VisualDashboardCard } from "./VisualDashboardCard";
import { VisualPhoneBooking } from "./VisualPhoneBooking";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingScrollStoryProps = {
  content: LandingContent["scrollStory"];
};

function TimelineDot({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-full min-h-[3rem] items-center justify-center ${className}`}
      aria-hidden
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-neutral-950 bg-white shadow-sm" />
    </div>
  );
}

function renderVisual(index: number) {
  switch (index) {
    case 0:
      return <VisualPhoneBooking />;
    case 1:
      return <VisualDashboardCard />;
    case 2:
      return <VisualClientsCard />;
    default:
      return null;
  }
}

export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;

  return (
    <section id="parcours" className={`scroll-mt-28 ${landingDivider} bg-white`}>
      <div className={`${landingSection} py-16 sm:py-20 md:py-28 lg:py-32`}>
        <div className="relative mx-auto max-w-6xl">
          <div
            className="pointer-events-none absolute bottom-6 left-[15px] top-6 w-px bg-neutral-200 md:left-1/2 md:top-8 md:bottom-8 md:-translate-x-1/2"
            aria-hidden
          />

          <div className="relative flex flex-col">
            {steps.map((step, index) => {
              const textLeft = index % 2 === 0;

              return (
                <article key={step.title} className="relative border-b border-transparent py-1 last:border-b-0">
                  <div
                    className="absolute left-[15px] top-[2.75rem] z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-neutral-950 bg-white shadow-sm md:hidden"
                    aria-hidden
                  />

                  <div className="pb-14 pt-3 last:pb-8 sm:pb-16 md:pb-24 md:pt-6 md:last:pb-10">
                    {/* Mobile : texte puis visuel, espacement vertical renforcé + léger stagger */}
                    <div className="flex flex-col gap-12 pl-10 sm:gap-14 sm:pl-11 md:hidden">
                      <ScrollReveal>
                        <div>
                          <h3 className="font-display text-2xl font-normal leading-[1.2] tracking-tight text-neutral-950">
                            {step.title}
                          </h3>
                          <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-600 sm:mt-5">
                            {step.text}
                          </p>
                        </div>
                      </ScrollReveal>
                      <ScrollReveal delayMs={55} className="flex justify-center">
                        {renderVisual(index)}
                      </ScrollReveal>
                    </div>

                    {/* Desktop */}
                    <ScrollReveal className="hidden md:block">
                      <div className="min-h-[min(280px,40vh)] grid-cols-[1fr_28px_1fr] items-center gap-x-8 md:grid lg:min-h-[min(300px,38vh)] lg:gap-x-12">
                        {textLeft ? (
                          <>
                            <div className="pr-2 lg:pr-6">
                              <h3 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 lg:text-[2.125rem]">
                                {step.title}
                              </h3>
                              <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-600">{step.text}</p>
                            </div>
                            <TimelineDot />
                            <div className="flex justify-center pl-2 lg:pl-6">{renderVisual(index)}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-center pr-2 lg:pr-6">{renderVisual(index)}</div>
                            <TimelineDot />
                            <div className="pl-2 lg:pl-6">
                              <h3 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 lg:text-[2.125rem]">
                                {step.title}
                              </h3>
                              <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-600">{step.text}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollReveal>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
