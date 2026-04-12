import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingDailyProps = {
  content: LandingContent["daily"];
};

export function LandingDaily({ content }: LandingDailyProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        <h2 className="max-w-3xl font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-5xl">
          {content.title}
        </h2>
        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10 lg:gap-16">
          {content.blocks.map((block, index) => (
            <div key={index} className="max-w-sm">
              <p className="font-display text-xl font-normal text-neutral-950 md:text-2xl">{block.title}</p>
              <p className="mt-4 text-base leading-relaxed text-neutral-950">{block.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
