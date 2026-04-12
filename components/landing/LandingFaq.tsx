"use client";

import { useId, useState } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingFaqProps = {
  content: LandingContent["faq"];
};

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function LandingFaq({ content }: LandingFaqProps) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className={`scroll-mt-28 ${landingDivider} bg-white`} aria-labelledby={`${baseId}-heading`}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 lg:items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <h2
              id={`${baseId}-heading`}
              className="whitespace-pre-line font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]"
            >
              {content.title}
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-neutral-600 md:text-lg">{content.subtitle}</p>
          </div>

          <div className="lg:col-span-8">
            <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200/90 bg-white md:rounded-3xl">
              {content.items.map((item, i) => {
                const open = openIndex === i;
                const triggerId = `${baseId}-t-${i}`;
                const panelId = `${baseId}-p-${i}`;

                return (
                  <li key={i}>
                    <h3 className="m-0">
                      <button
                        type="button"
                        id={triggerId}
                        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-neutral-50/80 md:px-6 md:py-5"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenIndex((p) => (p === i ? null : i))}
                      >
                        <span className="text-base font-medium text-neutral-950 md:text-lg">{item.question}</span>
                        <Chevron
                          className={`mt-0.5 shrink-0 text-neutral-500 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      className={`overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none ${
                        open ? "max-h-[min(80vh,1200px)]" : "max-h-0"
                      }`}
                    >
                      <div className="px-4 pb-5 pt-0 md:px-6 md:pb-6">
                        <p className="whitespace-pre-line text-base leading-relaxed text-neutral-600">{item.answer}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
