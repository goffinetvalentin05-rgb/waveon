import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingSection } from "./landing-tokens";

type LandingHeroProps = {
  content: LandingContent["hero"];
};

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className={`${landingSection} pb-20 pt-16 md:pb-28 md:pt-24`}>
      <div className="max-w-3xl">
        <h1 className="font-display text-[2.5rem] font-normal leading-[1.06] tracking-[-0.02em] text-neutral-950 md:text-6xl lg:text-7xl">
          {content.title}
        </h1>
        <p className="mt-10 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-950 md:text-lg">
          {content.subtitle}
        </p>
        <div className="mt-12">
          <Link
            href={content.cta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-950 px-8 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {content.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
