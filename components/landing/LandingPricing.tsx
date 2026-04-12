import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionSoft, landingSectionY } from "./landing-tokens";

type LandingPricingProps = {
  content: LandingContent["pricing"];
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4.5 9.5 7.5 12.5 14 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingPricing({ content }: LandingPricingProps) {
  const { starter, pro } = content;

  return (
    <section id="tarifs" className={`scroll-mt-28 ${landingDivider} ${landingSectionSoft}`}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
          {content.title}
        </h2>
        <div className="mt-14 grid gap-6 md:mt-16 md:grid-cols-2 md:gap-8 lg:mx-auto lg:max-w-4xl">
          <PlanCard name={starter.name} price={starter.price} bullets={starter.bullets} highlighted={false} />
          <PlanCard name={pro.name} price={pro.price} bullets={pro.bullets} highlighted />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  bullets,
  highlighted,
}: {
  name: string;
  price: string;
  bullets: readonly string[];
  highlighted: boolean;
}) {
  if (highlighted) {
    return (
      <div className="flex flex-col rounded-3xl border border-indigo-950/30 bg-indigo-950 p-8 text-white shadow-xl shadow-indigo-950/25 md:p-10">
        <p className="font-display text-2xl font-normal">{name}</p>
        <p className="mt-4 text-lg text-indigo-100">{price}</p>
        <ul className="mt-10 space-y-4 text-base leading-relaxed text-indigo-50">
          {bullets.map((line, i) => (
            <li key={i} className="flex gap-3">
              <CheckIcon className="mt-0.5 shrink-0 text-violet-200" />
              <span className="whitespace-pre-line">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`${landingCard} flex flex-col p-8 md:p-10`}>
      <p className="font-display text-2xl font-normal text-neutral-950">{name}</p>
      <p className="mt-4 text-lg text-neutral-600">{price}</p>
      <ul className="mt-10 space-y-4 text-base leading-relaxed text-neutral-600">
        {bullets.map((line, i) => (
          <li key={i} className="flex gap-3">
            <CheckIcon className="mt-0.5 shrink-0 text-violet-500" />
            <span className="whitespace-pre-line">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
