import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingBenefitsProps = {
  content: LandingContent["benefits"];
};

export function LandingBenefits({ content }: LandingBenefitsProps) {
  const { sectionId, sectionTitle, items } = content;

  return (
    <section id={sectionId} className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        {sectionTitle ? (
          <h2 className="mb-16 max-w-xl font-display text-3xl font-normal tracking-tight text-neutral-950 md:text-4xl">
            {sectionTitle}
          </h2>
        ) : null}
        <div className="grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-16">
          {items.map((item, index) => (
            <div key={`${sectionId}-${index}`} className="max-w-sm">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                {item.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-2xl font-normal tracking-tight text-neutral-950 md:text-3xl">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
