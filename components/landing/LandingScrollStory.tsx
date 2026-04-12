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
 * Parcours type landing SaaS (réf. taap.it) : fond léger, texte + timeline à gauche,
 * bloc produit sticky encadré à droite ; le scroll des étapes pilote le mockup.
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
    const line = vh * 0.38;

    type Cand = { i: number; d: number; vis: boolean };
    const cands: Cand[] = [];

    steps.forEach((_, i) => {
      const el = blockRefs.current[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const d = Math.abs(mid - line);
      const vis = r.bottom > 56 && r.top < vh - 56;
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
      className={`scroll-mt-28 ${landingDivider} bg-[#fafafa]`}
      aria-labelledby="parcours-aria-title"
    >
      <h2 id="parcours-aria-title" className="sr-only">
        Parcours
      </h2>

      <div className={`${landingSection} py-20 md:py-24 lg:py-28`}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-20">
          {/* Mobile : mockup d’abord ; desktop : même rangée, colonne droite (taap-like) */}
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1">
            <div className="sticky top-24 z-10 md:top-28">
              <div className="rounded-[1.75rem] border border-neutral-200/90 bg-white p-5 shadow-[0_32px_80px_-48px_rgba(0,0,0,0.22),0_12px_40px_-32px_rgba(0,0,0,0.08)] md:rounded-[2rem] md:p-7 lg:rounded-[2.25rem] lg:p-8">
                <div className="mb-5 flex items-center gap-2 md:mb-6" aria-hidden>
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${
                        i === active
                          ? "w-8 bg-neutral-950"
                          : i < active
                            ? "w-1.5 bg-neutral-400"
                            : "w-1.5 bg-neutral-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="relative isolate flex min-h-[360px] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-neutral-50/90 to-white sm:min-h-[400px] lg:min-h-[520px] xl:min-h-[560px]">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_42%,rgba(15,23,42,0.06)_0%,transparent_70%)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 top-[52%] -z-10 h-[55%] w-[88%] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-neutral-950/[0.04] blur-3xl motion-reduce:blur-none"
                    aria-hidden
                  />
                  <div
                    key={active}
                    className="landing-story-visual-swap relative z-10 flex w-full justify-center px-1 pt-1"
                  >
                    {renderVisual(active)}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Colonne narrative + repères verticaux */}
          <div className="relative min-w-0 lg:col-start-1 lg:row-start-1 lg:pr-4">
            <div
              className="pointer-events-none absolute bottom-24 left-[15px] top-24 hidden w-px bg-gradient-to-b from-neutral-300 via-neutral-200/90 to-transparent lg:block"
              aria-hidden
            />

            <div className="space-y-0">
              {steps.map((step, i) => (
                <article
                  key={step.title}
                  ref={setBlockRef(i)}
                  id={`parcours-etape-${i + 1}`}
                  aria-current={i === active ? "step" : undefined}
                  data-active={i === active ? "true" : "false"}
                  className="relative flex min-h-[min(82dvh,680px)] flex-col justify-center py-8 pl-11 transition-[opacity] duration-500 ease-out motion-reduce:transition-none data-[active=false]:opacity-50 data-[active=true]:opacity-100 motion-reduce:data-[active=false]:opacity-100 md:min-h-[min(88dvh,760px)] md:pl-12 lg:min-h-[min(96dvh,840px)] lg:py-12 lg:pl-14"
                >
                  <div
                    className="absolute left-0 top-[0.42em] flex h-8 w-8 items-center justify-center"
                    aria-hidden
                  >
                    <span
                      className={`block h-2.5 w-2.5 rounded-full ring-4 transition-[background-color,transform,box-shadow] duration-500 ease-out motion-reduce:transition-none ${
                        i === active
                          ? "scale-110 bg-neutral-950 ring-neutral-950/12 shadow-[0_0_0_6px_rgba(0,0,0,0.04)]"
                          : "bg-neutral-300 ring-transparent"
                      }`}
                    />
                  </div>

                  <h3
                    className={`font-display text-2xl font-normal leading-[1.15] tracking-tight transition-[color,transform] duration-500 ease-out motion-reduce:transition-none md:text-3xl lg:text-[2.125rem] ${
                      i === active
                        ? "text-neutral-950"
                        : "text-neutral-500 motion-reduce:text-neutral-600"
                    } ${i === active ? "translate-y-0" : "translate-y-0.5"}`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-4 max-w-md text-base leading-relaxed transition-colors duration-500 ease-out motion-reduce:transition-none md:mt-5 md:text-lg ${
                      i === active ? "text-neutral-600" : "text-neutral-500"
                    }`}
                  >
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
