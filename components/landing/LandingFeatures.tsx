import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingFeaturesProps = {
  content: LandingContent["features"];
};

export function LandingFeatures({ content }: LandingFeaturesProps) {
  const { sectionId, sectionTitle, items } = content;

  return (
    <section id={sectionId} className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        {sectionTitle ? (
          <h2 className="mb-12 max-w-xl font-display text-3xl font-normal tracking-tight text-neutral-950 md:text-4xl">
            {sectionTitle}
          </h2>
        ) : null}
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {items.map((item, index) => (
            <li
              key={`${sectionId}-${index}`}
              className="grid gap-6 py-10 md:grid-cols-12 md:items-start md:gap-10 md:py-12"
            >
              <div className="md:col-span-4">
                <h3 className="font-display text-xl font-normal tracking-tight text-neutral-950 md:text-2xl">
                  {item.title}
                </h3>
              </div>
              <div className="md:col-span-8">
                <p className="max-w-lg text-sm leading-relaxed text-neutral-600 md:text-base">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
