"use client";

import type { ReactNode } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingDailyProps = {
  content: LandingContent["daily"];
};

const dailyCardShell =
  "group relative h-full overflow-hidden rounded-3xl border border-neutral-200/70 bg-white " +
  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-6px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.06)] " +
  "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "hover:-translate-y-1.5 hover:border-neutral-300/85 " +
  "hover:shadow-[0_4px_12px_rgba(0,0,0,0.05),0_18px_40px_-8px_rgba(0,0,0,0.12),0_40px_72px_-20px_rgba(0,0,0,0.1)] " +
  "active:translate-y-0 active:scale-[0.995] " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "motion-reduce:hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-6px_rgba(0,0,0,0.08)]";

function CardSheen() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-neutral-950/[0.035] via-transparent to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:group-hover:opacity-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 45%), linear-gradient(to bottom, rgba(0,0,0,0.025), transparent 38%)",
        }}
        aria-hidden
      />
    </>
  );
}

function DailyGlyph({ index }: { index: number }) {
  const stroke =
    "stroke-[1.65] text-neutral-600 transition-colors duration-300 group-hover:text-neutral-950 motion-reduce:group-hover:text-neutral-600";
  const svg = (children: ReactNode) => (
    <svg
      className={`h-3.5 w-3.5 ${stroke}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );

  switch (index) {
    case 0:
      return svg(
        <>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          <path d="M4.93 4.93l14.14 14.14" />
        </>,
      );
    case 1:
      return svg(
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </>,
      );
    case 2:
      return svg(
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>,
      );
    default:
      return null;
  }
}

function StepBadge({ index, total }: { index: number; total: number }) {
  return (
    <div
      className="relative flex h-[3.75rem] w-[3.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-full border border-neutral-200/90 bg-gradient-to-b from-white to-neutral-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)] transition-[transform,box-shadow,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-neutral-300 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_14px_rgba(0,0,0,0.08)] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)]"
      aria-label={`Étape ${index + 1} sur ${total}`}
    >
      <span className="font-display text-base font-normal tabular-nums leading-none text-neutral-950">
        {index + 1}
      </span>
      <DailyGlyph index={index} />
    </div>
  );
}

export function LandingDaily({ content }: LandingDailyProps) {
  const n = content.blocks.length;
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <ScrollReveal>
          <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
            {content.title}
          </h2>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 sm:mt-14 md:mt-20 md:grid-cols-3 md:gap-7 lg:gap-8">
          {content.blocks.map((block, index) => (
            <ScrollReveal key={index} delayMs={index * 48}>
              <div className={`${dailyCardShell} flex flex-col px-6 py-9 sm:px-8 sm:py-10 md:px-9 md:py-11`}>
                <CardSheen />
                <div className="relative z-10 flex h-full flex-col">
                  <StepBadge index={index} total={n} />
                  <p className="mt-8 font-display text-xl font-normal text-neutral-950 md:mt-9 md:text-2xl">
                    {block.title}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-neutral-600">{block.detail}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
