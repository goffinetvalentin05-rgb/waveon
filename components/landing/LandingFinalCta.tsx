import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingBtnPrimary, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingFinalCtaProps = {
  content: LandingContent["finalCta"];
};

export function LandingFinalCta({ content }: LandingFinalCtaProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200/90 bg-[#f5f5f5] px-8 py-20 text-center shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] md:px-14 md:py-24">
          <h2 className="font-display text-4xl font-normal leading-tight tracking-tight text-neutral-950 md:text-5xl lg:text-6xl">
            {content.title}
          </h2>
          <div className="mt-12 flex justify-center md:mt-14">
            <Link href={content.cta.href} className={landingBtnPrimary}>
              {content.cta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
