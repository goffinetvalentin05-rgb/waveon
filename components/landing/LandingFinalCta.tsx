"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingBtnPrimary, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingFinalCtaProps = {
  content: LandingContent["finalCta"];
};

export function LandingFinalCta({ content }: LandingFinalCtaProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <ScrollReveal>
          <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200/90 bg-[#f5f5f5] px-6 py-16 text-center shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] transition-shadow duration-[420ms] ease-out sm:px-10 sm:py-20 md:px-14 md:py-24 md:hover:shadow-[0_10px_32px_-14px_rgba(0,0,0,0.06)]">
            <h2 className="font-display text-4xl font-normal leading-[1.1] tracking-tight text-neutral-950 md:text-5xl lg:text-6xl">
              {content.title}
            </h2>
            <div className="mt-10 flex justify-center sm:mt-11 md:mt-14">
              <Link href={content.cta.href} className={landingBtnPrimary}>
                {content.cta.label}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
