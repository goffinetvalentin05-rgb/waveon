import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingBrandImageProps = {
  content: LandingContent["brandImage"];
};

export function LandingBrandImage({ content }: LandingBrandImageProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className={`${landingCard} relative order-2 min-h-[240px] overflow-hidden lg:order-1`} aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 via-white to-indigo-50/40" />
            <div className="relative flex h-full min-h-[240px] items-center justify-center p-10">
              <div className="grid w-full max-w-xs grid-cols-2 gap-3">
                <div className="aspect-[4/3] rounded-2xl border border-white/80 bg-white/90 shadow-sm" />
                <div className="aspect-[4/3] rounded-2xl border border-violet-100 bg-violet-50/80 shadow-sm" />
                <div className="col-span-2 h-16 rounded-2xl border border-neutral-100 bg-white/90 shadow-sm" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
              {content.title}
            </h2>
            <p className="mt-8 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 md:mt-10 md:text-lg">
              {content.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
