import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingProductProps = {
  content: LandingContent["product"];
};

export function LandingProduct({ content }: LandingProductProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        <h2 className="max-w-3xl font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-5xl">
          {content.title}
        </h2>
        <p className="mt-10 max-w-2xl text-base leading-relaxed text-neutral-950 md:text-lg">{content.text}</p>
      </div>
    </section>
  );
}
