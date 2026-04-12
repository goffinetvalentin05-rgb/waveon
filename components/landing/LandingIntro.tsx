import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingIntroProps = {
  content: LandingContent["intro"];
};

export function LandingIntro({ content }: LandingIntroProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className={`${landingCard} mx-auto max-w-4xl p-8 md:p-12 lg:p-14`}>
          <h2 className="text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
            {content.title}
          </h2>
          <p className="mx-auto mt-8 max-w-2xl whitespace-pre-line text-center text-base leading-relaxed text-neutral-600 md:mt-10 md:text-lg">
            {content.text}
          </p>
        </div>
      </div>
    </section>
  );
}
