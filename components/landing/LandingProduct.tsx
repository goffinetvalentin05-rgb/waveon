"use client";

import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingProductProps = {
  content: LandingContent["product"];
};

/** Aperçu aligné sur la copie : réservation claire → créneaux → synchro auto + agenda épuré. */
function ProductSystemMockup() {
  return (
    <div className={`${landingCard} overflow-hidden`} aria-hidden>
      <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-3.5 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Flux typique</p>
        <p className="mt-0.5 text-sm font-medium text-neutral-950">Réservation en ligne · agenda · sans action manuelle</p>
      </div>

      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-neutral-100">
        <div className="border-b border-neutral-100 p-5 md:p-6 sm:border-b-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Page de réservation</p>
          <p className="mt-3 text-sm font-semibold text-neutral-950">Coupe · 45 min</p>
          <p className="mt-0.5 text-xs text-neutral-500">Choix du créneau par le client</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["10:00", "11:30", "14:00", "16:30"].map((t, i) => (
              <span
                key={t}
                className={
                  i === 0
                    ? "rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold tabular-nums text-white"
                    : "rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium tabular-nums text-neutral-600"
                }
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-neutral-200/90 bg-[#fafafa] px-3.5 py-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white">
              ✓
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Automatique</p>
              <p className="text-xs font-medium leading-snug text-neutral-950">
                {"Confirmé — placé dans l'agenda"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Agenda</p>
            <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-neutral-600">
              Aujourd&apos;hui
            </span>
          </div>
          <ul className="mt-4 space-y-0 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {[
              { time: "10:00", label: "Coupe · client en ligne" },
              { time: "14:00", label: "Barbe · réservation web" },
            ].map((row) => (
              <li key={row.time} className="flex items-center justify-between gap-3 px-3 py-3 first:rounded-t-xl last:rounded-b-xl">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tabular-nums text-neutral-600">{row.time}</p>
                  <p className="truncate text-sm font-medium text-neutral-950">{row.label}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-neutral-400">OK</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function LandingProduct({ content }: LandingProductProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <ScrollReveal>
            <div className="lg:pt-1">
              <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
                {content.title}
              </h2>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 sm:mt-10 md:mt-12 md:text-lg">
                {content.text}
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delayMs={55}>
            <ProductSystemMockup />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
