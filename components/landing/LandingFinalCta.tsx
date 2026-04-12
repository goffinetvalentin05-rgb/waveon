"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingDivider, landingSection, landingSectionSoft, landingSectionY } from "./landing-tokens";

type LandingFinalCtaProps = {
  content: LandingContent["finalCta"];
};

export function LandingFinalCta({ content }: LandingFinalCtaProps) {
  return (
    <section className={`${landingDivider} ${landingSectionSoft}`}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <ScrollReveal>
          <div className="mx-auto max-w-4xl">
            <div className="rounded-[1.75rem] border border-neutral-200/80 bg-white px-6 py-14 text-center shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow,transform] duration-500 ease-out hover:shadow-[0_20px_48px_-24px_rgba(0,0,0,0.12)] motion-reduce:hover:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] sm:rounded-[2rem] sm:px-10 sm:py-16 md:px-14 md:py-20 lg:px-16 lg:py-24">
              <h2 className="mx-auto max-w-3xl font-display text-[1.85rem] font-normal leading-[1.12] tracking-tight text-neutral-950 sm:text-4xl md:text-[2.35rem] lg:text-[2.65rem]">
                {content.title}
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:mt-8 sm:text-lg md:mt-10">
                {content.subtitle}
              </p>
              <div className="mt-10 flex justify-center sm:mt-12 md:mt-14">
                <Link
                  href={content.cta.href}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-neutral-950 px-10 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.25)] transition-[background-color,box-shadow,transform] duration-500 ease-out hover:bg-neutral-800 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)] active:scale-[0.99] motion-reduce:active:scale-100 sm:px-12 sm:text-base"
                >
                  {content.cta.label}
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
