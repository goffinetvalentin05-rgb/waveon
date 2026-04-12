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
      return <VisualPhoneBooking />;
    case 1:
      return <VisualDashboardCard />;
    case 2:
      return <VisualClientsCard />;
    default:
      return null;
  }
}

/**
 * Parcours sticky : la colonne visuelle reste fixée pendant que les blocs texte
 * défilent ; l’étape la plus proche de la ligne de lecture pilote le mockup actif.
 */
export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;
  const blockRefs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  const rafRef = useRef<number | null>(null);

  const setBlockRef = (index: number) => (node: HTMLElement | null) => {
    blockRefs.current[index] = node;
  };

  const updateActive = useCallback(() => {
    const vh = window.innerHeight || 1;
    const line = vh * 0.36;

    type Cand = { i: number; d: number; vis: boolean };
    const cands: Cand[] = [];

    steps.forEach((_, i) => {
      const el = blockRefs.current[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const d = Math.abs(mid - line);
      const vis = r.bottom > 48 && r.top < vh - 48;
      cands.push({ i, d, vis });
    });

    if (cands.length === 0) return;

    const visPool = cands.filter((c) => c.vis);
    const pool = visPool.length > 0 ? visPool : cands;
    pool.sort((a, b) => a.d - b.d);
    const next = pool[0].i;

    setActive((prev) => (prev === next ? prev : next));
  }, [steps]);

  useEffect(() => {
    const tick = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateActive();
      });
    };

    updateActive();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateActive]);

  return (
    <section
      id="parcours"
      className={`scroll-mt-28 ${landingDivider} bg-white`}
      aria-labelledby="parcours-aria-title"
    >
      <h2 id="parcours-aria-title" className="sr-only">
        Parcours
      </h2>

      <div className={`${landingSection} py-16 md:py-20 lg:py-24`}>
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-20">
          {/* Colonne visuelle : sticky, pilote l’attention pendant le scroll du texte */}
          <aside className="sticky top-24 z-10 -mx-1 mb-10 border-b border-neutral-200/70 bg-white px-1 pb-8 md:top-28 lg:mx-0 lg:border-b-0 lg:bg-transparent lg:pb-0">
            <div className="mx-auto flex w-full max-w-[min(100%,440px)] flex-col lg:mx-0 lg:max-w-none">
              <div
                className="mb-6 flex items-center justify-center gap-2 lg:justify-start"
                aria-hidden
              >
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${
                      i === active
                        ? "w-10 bg-neutral-950"
                        : i < active
                          ? "w-1.5 bg-neutral-400"
                          : "w-1.5 bg-neutral-200"
                    }`}
                  />
                ))}
              </div>

              <div className="relative min-h-[min(44vh,340px)] w-full lg:min-h-[min(calc(100dvh-11rem),640px)]">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    aria-hidden={i !== active}
                    className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:duration-150 ${
                      i === active
                        ? "z-10 translate-y-0 opacity-100"
                        : "pointer-events-none z-0 translate-y-5 opacity-0 motion-reduce:translate-y-0"
                    }`}
                  >
                    {renderVisual(i)}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Colonne narrative : blocs réels dans le flux, fort rythme vertical */}
          <div className="min-w-0 space-y-0 lg:pt-4">
            {steps.map((step, i) => (
              <article
                key={step.title}
                ref={setBlockRef(i)}
                id={`parcours-etape-${i + 1}`}
                aria-current={i === active ? "step" : undefined}
                data-active={i === active ? "true" : "false"}
                className="flex min-h-[min(86dvh,720px)] flex-col justify-center border-l border-neutral-200/90 py-10 pl-6 transition-[border-color] duration-500 ease-out motion-reduce:transition-none data-[active=true]:border-neutral-950 md:min-h-[min(90dvh,780px)] md:pl-8 lg:min-h-[min(100dvh,880px)] lg:py-14 lg:pl-10"
              >
                <h3 className="font-display text-2xl font-normal leading-tight tracking-tight text-neutral-950 md:text-3xl lg:text-[2.125rem]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-600 md:mt-5 md:text-lg">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
