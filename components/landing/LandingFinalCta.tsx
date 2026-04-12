import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingFinalCtaProps = {
  content: LandingContent["finalCta"];
};

export function LandingFinalCta({ content }: LandingFinalCtaProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} py-24 text-center md:py-32`}>
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-neutral-950 md:text-5xl lg:text-6xl">
          {content.title}
        </h2>
        <div className="mt-12">
          <Link
            href={content.cta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-950 px-10 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {content.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
