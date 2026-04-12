"use client";

import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingBrandImageProps = {
  content: LandingContent["brandImage"];
};

/**
 * Aperçu de la vitrine côté client (page publique) — pas un extrait CRM :
 * aligné avec « image pro » / expérience moderne pour les clients finaux.
 */
function PublicBookingPreviewMockup() {
  return (
    <div
      className={`${landingCard} order-2 overflow-hidden shadow-[0_8px_36px_-20px_rgba(0,0,0,0.1)] transition-shadow duration-500 ease-out hover:shadow-[0_16px_48px_-24px_rgba(0,0,0,0.14)] motion-reduce:transition-none lg:order-1`}
      aria-hidden
    >
      <div className="border-b border-neutral-100 bg-gradient-to-b from-[#fafafa] to-white px-6 pb-8 pt-8 text-center md:px-8 md:pb-10 md:pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Exemple · page client</p>
        <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 font-display text-xl font-normal text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          M
        </div>
        <p className="mt-4 font-display text-2xl font-normal tracking-tight text-neutral-950 md:text-[1.65rem]">Marie Studio</p>
        <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed text-neutral-600">
          Une page claire pour réserver — à l&apos;image de ton activité.
        </p>
      </div>

      <div className="space-y-4 px-6 py-6 md:px-8 md:py-8">
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-1 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Prestations</p>
          <ul className="divide-y divide-neutral-100">
            {[
              { label: "Coupe · sur-mesure", hint: "45 min", price: "65.-" },
              { label: "Soin capillaire", hint: "30 min", price: "48.-" },
              { label: "Barbe", hint: "20 min", price: "32.-" },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-3 px-3 py-3.5 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-neutral-950">{row.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{row.hint}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-950">{row.price}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-full bg-neutral-950 py-3.5 text-center text-sm font-medium text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.25)]">
          Choisir un créneau
        </div>
        <p className="text-center text-[11px] text-neutral-400">{"Interface sobre · mobile & bureau"}</p>
      </div>
    </div>
  );
}

export function LandingBrandImage({ content }: LandingBrandImageProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <ScrollReveal>
            <PublicBookingPreviewMockup />
          </ScrollReveal>
          <ScrollReveal delayMs={55}>
            <div className="order-1 lg:order-2 lg:pt-1">
              <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
                {content.title}
              </h2>
              <p className="mt-8 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 sm:mt-10 md:mt-12 md:text-lg">
                {content.text}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
