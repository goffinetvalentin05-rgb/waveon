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
        <div className="mx-auto max-w-3xl rounded-3xl border border-violet-100 bg-gradient-to-b from-violet-50/50 to-white px-8 py-16 text-center shadow-[0_2px_48px_-12px_rgba(15,23,42,0.06)] md:px-12 md:py-20">
          <h2 className="font-display text-4xl font-normal leading-tight tracking-tight text-neutral-950 md:text-5xl lg:text-6xl">
            {content.title}
          </h2>
          <div className="mt-10 flex justify-center md:mt-12">
            <Link href={content.cta.href} className={landingBtnPrimary}>
              {content.cta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
