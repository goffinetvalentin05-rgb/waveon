"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingDivider, landingSection, landingSectionSoft, landingSectionY } from "./landing-tokens";

type LandingPricingProps = {
  content: LandingContent["pricing"];
};

const SIGNUP_HREF = "/signup";

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
        <ScrollReveal>
          <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
            {content.title}
          </h2>
        </ScrollReveal>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-neutral-600 md:text-base">
          {content.billingNote}
        </p>
        <div className="mt-12 grid gap-7 sm:mt-14 md:mt-20 md:grid-cols-2 md:gap-8 lg:mx-auto lg:max-w-4xl">
          <ScrollReveal delayMs={0}>
            <PlanCard
              name={starter.name}
              price={starter.price}
              bullets={starter.bullets}
              variant="light"
              ctaLabel="Choisir Starter"
            />
          </ScrollReveal>
          <ScrollReveal delayMs={120}>
            <PlanCard
              name={pro.name}
              price={pro.price}
              bullets={pro.bullets}
              variant="dark"
              ctaLabel="Choisir Pro"
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  bullets,
  variant,
  ctaLabel,
}: {
  name: string;
  price: string;
  bullets: readonly string[];
  variant: "light" | "dark";
  ctaLabel: string;
}) {
  const isDark = variant === "dark";

  const shell = isDark
    ? "group relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-white/10 bg-neutral-950 p-8 text-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35),0_24px_56px_-24px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.65rem] before:bg-gradient-to-b before:from-white/[0.07] before:via-transparent before:to-transparent before:opacity-60 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.55)] motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] sm:p-9 md:p-11"
    : "group relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-neutral-200/80 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,0,0,0.1)] ring-1 ring-neutral-950/[0.04] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.65rem] before:bg-gradient-to-b before:from-neutral-950/[0.03] before:via-transparent before:to-transparent hover:-translate-y-1.5 hover:border-neutral-300/90 hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.14)] motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,0,0,0.1)] sm:p-9 md:p-11";

  const ctaLight =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-neutral-950 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] transition-[background-color,box-shadow,transform,color] duration-500 ease-out hover:bg-neutral-950 hover:text-white hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.2)] active:scale-[0.99] motion-reduce:active:scale-100";

  const ctaDark =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.25)] transition-[background-color,box-shadow,transform] duration-500 ease-out hover:bg-neutral-100 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] active:scale-[0.99] motion-reduce:active:scale-100";

  return (
    <div className={shell}>
      <div className="relative z-10 flex h-full flex-col">
        <p className={`font-display text-2xl font-normal ${isDark ? "text-white" : "text-neutral-950"}`}>{name}</p>
        <p className={`mt-4 text-lg ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>{price}</p>
        <ul className={`mt-10 flex-1 space-y-4 text-base leading-relaxed ${isDark ? "text-neutral-200" : "text-neutral-600"}`}>
          {bullets.map((line, i) => (
            <li key={i} className="flex gap-3">
              <CheckIcon className={`mt-0.5 shrink-0 ${isDark ? "text-neutral-400" : "text-neutral-950"}`} />
              <span className="whitespace-pre-line">{line}</span>
            </li>
          ))}
        </ul>
        <div className="relative z-10 mt-auto pt-10">
          <Link href={SIGNUP_HREF} className={isDark ? ctaDark : ctaLight}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
