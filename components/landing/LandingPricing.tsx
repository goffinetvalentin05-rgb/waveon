import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingPricingProps = {
  content: LandingContent["pricing"];
};

export function LandingPricing({ content }: LandingPricingProps) {
  const { starter, pro } = content;

  return (
    <section className={landingDivider}>
      <div className={`${landingSection} py-20 md:py-28`}>
        <h2 className="max-w-3xl font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-5xl">
          {content.title}
        </h2>
        <div className="mt-16 grid gap-6 md:grid-cols-2 md:gap-8">
          <PlanCard name={starter.name} price={starter.price} bullets={starter.bullets} />
          <PlanCard name={pro.name} price={pro.price} bullets={pro.bullets} />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  bullets,
}: {
  name: string;
  price: string;
  bullets: readonly string[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 p-8 md:p-10">
      <p className="font-display text-2xl font-normal text-neutral-950">{name}</p>
      <p className="mt-4 text-lg text-neutral-950">{price}</p>
      <ul className="mt-10 space-y-4 text-base leading-relaxed text-neutral-950">
        {bullets.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-neutral-950" aria-hidden />
            <span className="whitespace-pre-line">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
