import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingBrandImageProps = {
  content: LandingContent["brandImage"];
};

export function LandingBrandImage({ content }: LandingBrandImageProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        <h2 className="max-w-3xl font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-5xl">
          {content.title}
        </h2>
        <p className="mt-10 max-w-2xl whitespace-pre-line text-base leading-relaxed text-neutral-950 md:text-lg">
          {content.text}
        </p>
      </div>
    </section>
  );
}
