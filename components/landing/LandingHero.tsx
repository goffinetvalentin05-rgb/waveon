import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingSection } from "./landing-tokens";

type LandingHeroProps = {
  content: LandingContent["hero"];
};

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className={`${landingSection} pb-24 pt-20 md:pb-32 md:pt-28`}>
      <div className="max-w-3xl">
        <h1 className="font-display text-[2.75rem] font-normal leading-[1.05] tracking-[-0.02em] text-neutral-950 md:text-6xl lg:text-7xl">
          {content.title}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 md:text-lg">
          {content.subtitle}
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href={content.primaryCta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-950 px-8 py-2.5 text-sm font-medium tracking-wide text-white transition hover:bg-neutral-800"
          >
            {content.primaryCta.label}
          </Link>
          <Link
            href={content.secondaryCta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-transparent px-8 py-2.5 text-sm font-medium tracking-wide text-neutral-950 transition hover:border-neutral-950"
          >
            {content.secondaryCta.label}
          </Link>
        </div>
      </div>
      <div className="mt-20 md:mt-28" aria-hidden>
        <div className="h-px w-full max-w-md bg-neutral-200" />
      </div>
    </section>
  );
}
