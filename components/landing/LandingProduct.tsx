import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingProductProps = {
  content: LandingContent["product"];
};

export function LandingProduct({ content }: LandingProductProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
              {content.title}
            </h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 md:mt-10 md:text-lg">
              {content.text}
            </p>
          </div>
          <div className={`${landingCard} relative min-h-[260px] overflow-hidden p-8 lg:min-h-[300px]`} aria-hidden>
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-100/80 blur-2xl" />
            <div className="absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-indigo-100/50 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div className="space-y-3 rounded-2xl border border-neutral-100 bg-white/90 p-4 shadow-sm">
                <div className="h-2 w-24 rounded-full bg-neutral-200" />
                <div className="h-2 w-40 rounded-full bg-neutral-100" />
                <div className="mt-3 flex gap-2">
                  <span className="h-8 flex-1 rounded-xl bg-violet-50" />
                  <span className="h-8 w-16 rounded-xl bg-neutral-100" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-20 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50/80" />
                <div className="h-20 w-24 rounded-2xl border border-violet-100 bg-violet-50/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
