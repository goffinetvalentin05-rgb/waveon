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
        <div className="mt-14 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6 lg:gap-8">
          {content.blocks.map((block, index) => (
            <div key={index} className={`${landingCard} flex flex-col p-8 md:p-9`}>
              <span className="block h-11 w-11 rounded-2xl bg-violet-100" aria-hidden />
              <p className="mt-6 font-display text-xl font-normal text-neutral-950 md:text-2xl">{block.title}</p>
              <p className="mt-4 text-base leading-relaxed text-neutral-600">{block.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
