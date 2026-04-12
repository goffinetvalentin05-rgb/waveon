import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingDailyProps = {
  content: LandingContent["daily"];
};

export function LandingDaily({ content }: LandingDailyProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
          {content.title}
        </h2>
        <div className="mt-16 grid gap-6 md:mt-20 md:grid-cols-3 md:gap-7 lg:gap-8">
          {content.blocks.map((block, index) => (
            <div key={index} className={`${landingCard} flex flex-col px-8 py-10 md:px-9 md:py-11`}>
              <span
                className="block h-10 w-10 rounded-2xl border border-neutral-200 bg-[#f5f5f5]"
                aria-hidden
              />
              <p className="mt-8 font-display text-xl font-normal text-neutral-950 md:mt-9 md:text-2xl">
                {block.title}
              </p>
              <p className="mt-4 text-base leading-relaxed text-neutral-600">{block.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
