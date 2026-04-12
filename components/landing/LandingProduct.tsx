"use client";

import type { LandingContent } from "@/lib/landing/config";
import { ScrollReveal } from "./ScrollReveal";
import { landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingProductProps = {
  content: LandingContent["product"];
};

const bento =
  "rounded-[1.35rem] border border-neutral-200/70 bg-white shadow-[0_8px_32px_-20px_rgba(0,0,0,0.1),0_2px_8px_-4px_rgba(0,0,0,0.04)] md:rounded-[1.65rem]";

function IconCalendar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconUsers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconZap({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M13 2L3 14h8l-1 8 10-12h-6l2-10z" />
    </svg>
  );
}

/** Cartes bento flottantes, colonnes décalées (style masonry / taap). */
function ProductBentoMockup() {
  return (
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-start md:gap-4 lg:gap-5" aria-hidden>
      {/* Colonne 1 — texte seul (sans mockup téléphone) */}
      <div className="min-w-0 shrink-0 md:w-[min(100%,32%)] lg:w-[30%]">
        <ScrollReveal delayMs={0}>
          <div className={`${bento} flex flex-col p-5 md:p-6`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Aperçu client</p>
            <p className="mt-1 font-display text-lg font-normal text-neutral-950 md:text-xl">Réserver en ligne</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Créneaux clairs, confirmation instantanée.
            </p>
            <div className="mt-6 h-px max-w-[4.5rem] bg-neutral-200" />
          </div>
        </ScrollReveal>
      </div>

      {/* Colonne 2 — léger décalage vers le bas */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 md:max-w-[31%] md:pt-8 lg:max-w-[30%] lg:pt-10">
        <ScrollReveal delayMs={70}>
          <div className={`${bento} px-5 py-6 md:px-6 md:py-7`}>
            <p className="font-display text-4xl font-normal tabular-nums tracking-tight text-neutral-950 md:text-5xl">
              24<span className="text-neutral-400">/</span>7
            </p>
            <p className="mt-2 text-sm leading-snug text-neutral-600">
              Ton agenda reste ouvert : les clients réservent quand ils veulent.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={130}>
          <div className={`${bento} p-4 md:p-5`}>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { Icon: IconCalendar, label: "Agenda" },
                { Icon: IconUsers, label: "Clients" },
                { Icon: IconZap, label: "Auto" },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-[#f7f7f7] ring-1 ring-neutral-200/80"
                >
                  <Icon className="h-5 w-5 text-neutral-700 md:h-6 md:w-6" />
                  <span className="text-[10px] font-semibold text-neutral-600">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-600">
              Réservation, clients et créneaux qui se synchronisent tout seuls.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Colonne 3 — plus bas : effet « désorganisé » */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 md:max-w-[31%] md:pt-16 lg:max-w-[30%] lg:pt-20">
        <ScrollReveal delayMs={100}>
          <div className={`${bento} px-5 py-5 md:px-6 md:py-6`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Un seul flux</p>
            <p className="mt-1 text-sm font-medium text-neutral-950 md:text-base">Réservation · Agenda · Suivi</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["RDV", "Fiches", "Créneaux", "Rappels"].map((label) => (
                <span
                  key={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500 ring-1 ring-neutral-200/90"
                >
                  {label.slice(0, 2)}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={200}>
          <div className={`${bento} px-5 py-5 md:px-6`}>
            <p className="text-sm font-medium text-neutral-950">Expérience pro</p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
              Interface sobre : tes clients voient une vitrine claire, toi un cockpit simple.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

export function LandingProduct({ content }: LandingProductProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="flex flex-col gap-12 lg:gap-16">
          <ScrollReveal>
            <div className="max-w-3xl lg:pt-1">
              <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
                {content.title}
              </h2>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 sm:mt-10 md:mt-12 md:text-lg">
                {content.text}
              </p>
            </div>
          </ScrollReveal>
          <div className="min-w-0">
            <ProductBentoMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
