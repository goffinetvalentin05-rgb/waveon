"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { VisualClientsCard } from "./VisualClientsCard";
import { VisualDashboardCard } from "./VisualDashboardCard";
import { VisualPhoneBooking } from "./VisualPhoneBooking";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingScrollStoryProps = {
  content: LandingContent["scrollStory"];
};

function renderVisual(index: number) {
  switch (index) {
    case 0:
      return <VisualPhoneBooking disableFloat />;
    case 1:
      return <VisualDashboardCard />;
    case 2:
      return <VisualClientsCard />;
    default:
      return null;
  }
}

function useActiveStoryStep(stepCount: number) {
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);

  const setStepRef = useCallback((index: number) => (node: HTMLDivElement | null) => {
    stepRefs.current[index] = node;
  }, []);

  const recompute = useCallback(() => {
    const vh = window.innerHeight || 1;
    const targetY = vh * 0.42;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < stepCount; i++) {
      const el = stepRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 80 || r.top > vh - 80) continue;
      const mid = (r.top + r.bottom) / 2;
      const d = Math.abs(mid - targetY);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setActive((p) => (p === best ? p : best));
  }, [stepCount]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
    };
    recompute();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [recompute]);

  return { active, setStepRef };
}

function StoryVisualStage({ active, count }: { active: number; count: number }) {
  return (
    <div className="relative min-h-[min(72svh,560px)] w-full md:min-h-[min(76svh,600px)] lg:min-h-[min(78svh,640px)]">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex w-full items-center justify-center transition-opacity duration-[480ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
            i === active ? "relative z-10 opacity-100" : "pointer-events-none absolute inset-0 z-0 opacity-0"
          }`}
          aria-hidden={i !== active}
        >
          {renderVisual(i)}
        </div>
      ))}
    </div>
  );
}

/** Parcours sticky desktop + défilement vertical mobile — texte et visuels synchronisés par étape. */
export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;
  const n = steps.length;
  const { active, setStepRef } = useActiveStoryStep(n);

  return (
    <section
      id="parcours"
      className={`scroll-mt-28 ${landingDivider} bg-white`}
      aria-labelledby="parcours-aria-title"
    >
      <h2 id="parcours-aria-title" className="sr-only">
        Parcours
      </h2>

      <div className={`${landingSection} py-20 md:py-24 lg:py-28`}>
        {/* Mobile : une colonne, texte puis visuel par étape */}
        <div className="mx-auto max-w-lg space-y-20 lg:hidden">
          {steps.map((step, i) => (
            <div key={step.title} className="space-y-8">
              <div>
                <h3 className="font-display text-2xl font-normal leading-[1.15] tracking-tight text-neutral-950 md:text-[1.75rem]">
                  {step.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-600 md:text-lg">{step.text}</p>
              </div>
              <div className="rounded-[1.5rem] border border-neutral-200/90 bg-neutral-50/40 px-4 py-8 md:rounded-[1.75rem] md:px-6 md:py-10">
                {renderVisual(i)}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop : gauche = scroll des étapes, droite = visuel sticky + crossfade */}
        <div className="mx-auto hidden max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.05fr)] lg:items-start lg:gap-x-16 xl:gap-x-20">
          <div className="min-w-0 pb-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                ref={setStepRef(i)}
                id={`parcours-etape-${i + 1}`}
                className="flex min-h-[125svh] max-w-xl flex-col justify-center py-10 first:pt-4 last:pb-24 lg:py-14"
                aria-current={i === active ? "step" : undefined}
              >
                <div
                  className={`transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                    i === active
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-[0.28] motion-reduce:translate-y-0 motion-reduce:opacity-[0.42]"
                  }`}
                >
                  <h3 className="font-display text-[2.125rem] font-normal leading-[1.12] tracking-tight text-neutral-950 xl:text-[2.25rem]">
                    {step.title}
                  </h3>
                  <p className="mt-5 text-lg leading-relaxed text-neutral-600 xl:text-[1.125rem]">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="sticky top-24 pb-12 pt-2 md:top-28 md:pt-4">
              <div className="rounded-[1.75rem] border border-neutral-200/90 bg-white p-6 shadow-[0_24px_64px_-40px_rgba(0,0,0,0.18)] md:rounded-[2rem] md:p-8 xl:rounded-[2.125rem] xl:p-9">
                <StoryVisualStage active={active} count={n} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
