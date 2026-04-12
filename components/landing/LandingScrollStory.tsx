"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { VisualAgendaWeekCard } from "./VisualAgendaWeekCard";
import { VisualCentralHubCard } from "./VisualCentralHubCard";
import { VisualPhoneBooking } from "./VisualPhoneBooking";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingScrollStoryProps = {
  content: LandingContent["scrollStory"];
};

const IO_THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];

function renderVisual(index: number) {
  switch (index) {
    case 0:
      return <VisualPhoneBooking disableFloat />;
    case 1:
      return <VisualAgendaWeekCard />;
    case 2:
      return <VisualCentralHubCard />;
    default:
      return null;
  }
}

function useActiveStoryStep(stepCount: number) {
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const ratiosRef = useRef<Float32Array>(new Float32Array(stepCount));
  const [active, setActive] = useState(0);

  const setStepRef = useCallback((index: number) => (node: HTMLDivElement | null) => {
    stepRefs.current[index] = node;
  }, []);

  const pickFromRatios = useCallback(() => {
    const ratios = ratiosRef.current;
    let best = 0;
    let max = -1;
    for (let i = 0; i < stepCount; i++) {
      const r = ratios[i] ?? 0;
      if (r > max) {
        max = r;
        best = i;
      }
    }
    if (max < 0.02) {
      const vh = window.innerHeight || 1;
      const targetY = vh * 0.4;
      let bestDist = Number.POSITIVE_INFINITY;
      let bi = 0;
      for (let i = 0; i < stepCount; i++) {
        const el = stepRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid = (rect.top + rect.bottom) / 2;
        const d = Math.abs(mid - targetY);
        if (d < bestDist) {
          bestDist = d;
          bi = i;
        }
      }
      setActive((p) => (p === bi ? p : bi));
      return;
    }
    setActive((p) => (p === best ? p : best));
  }, [stepCount]);

  useEffect(() => {
    const ratios = ratiosRef.current;
    if (ratios.length !== stepCount) {
      ratiosRef.current = new Float32Array(stepCount);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const raw = (e.target as HTMLElement).dataset.storyStep;
          const idx = raw != null ? Number.parseInt(raw, 10) : NaN;
          if (Number.isFinite(idx) && idx >= 0 && idx < stepCount) {
            ratiosRef.current[idx] = e.intersectionRatio;
          }
        }
        pickFromRatios();
      },
      { root: null, rootMargin: "-36% 0px -36% 0px", threshold: IO_THRESHOLDS },
    );

    const observeAll = () => {
      for (let i = 0; i < stepCount; i++) {
        const el = stepRefs.current[i];
        if (el) io.observe(el);
      }
    };

    observeAll();
    const tick = () => pickFromRatios();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
    tick();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, [pickFromRatios, stepCount]);

  return { active, setStepRef };
}

function useSectionScrollParallax() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      if (reduce) {
        setParallaxY(0);
        return;
      }
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = Math.max(r.height - vh, 1);
      const t = Math.min(Math.max(-r.top / span, 0), 1);
      setParallaxY((t - 0.5) * 10);
    };

    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);

  return { sectionRef, parallaxY };
}

function StoryVisualStage({ active, count }: { active: number; count: number }) {
  return (
    <div className="relative min-h-[min(72svh,560px)] w-full md:min-h-[min(76svh,600px)] lg:min-h-[min(78svh,640px)]">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex w-full items-center justify-center motion-reduce:transition-none ${
            i === active
              ? "relative z-10 opacity-100 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] translate-y-0 scale-100"
              : "pointer-events-none absolute inset-0 z-0 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] translate-y-2 scale-[0.98] motion-reduce:translate-y-0 motion-reduce:scale-100"
          }`}
          aria-hidden={i !== active}
        >
          {renderVisual(i)}
        </div>
      ))}
    </div>
  );
}

/** Parcours sticky (md+) : texte à gauche, visuel sticky à droite + lecture scroll. */
export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;
  const n = steps.length;
  const { active, setStepRef } = useActiveStoryStep(n);
  const { sectionRef, parallaxY } = useSectionScrollParallax();

  return (
    <section
      ref={sectionRef}
      id="parcours"
      className={`scroll-mt-28 ${landingDivider} bg-white`}
      aria-labelledby="parcours-aria-title"
    >
      <h2 id="parcours-aria-title" className="sr-only">
        Parcours
      </h2>

      <div className={`${landingSection} py-20 md:py-24 lg:py-28`}>
        <div className="mx-auto max-w-lg space-y-20 md:hidden">
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

        <div className="mx-auto hidden max-w-6xl md:grid md:grid-cols-[minmax(0,1fr)_minmax(300px,1.05fr)] md:items-start md:gap-x-10 lg:gap-x-16 xl:gap-x-20">
          <div className="min-w-0 pb-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                ref={setStepRef(i)}
                id={`parcours-etape-${i + 1}`}
                data-story-step={i}
                className="flex min-h-[125svh] max-w-xl flex-col justify-center py-10 first:pt-4 last:pb-24 md:py-14"
                aria-current={i === active ? "step" : undefined}
              >
                <div
                  className={`transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                    i === active
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-[0.26] motion-reduce:translate-y-0 motion-reduce:opacity-[0.42]"
                  }`}
                >
                  <h3 className="font-display text-[clamp(1.65rem,2.5vw,2.25rem)] font-normal leading-[1.12] tracking-tight text-neutral-950">
                    {step.title}
                  </h3>
                  <p className="mt-5 text-lg leading-relaxed text-neutral-600 xl:text-[1.125rem]">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div
              className="sticky top-20 pb-10 pt-2 will-change-transform md:top-24 md:pb-12 md:pt-4 lg:top-28"
              style={{ transform: `translate3d(0, ${parallaxY}px, 0)` }}
            >
              <div className="rounded-[1.75rem] border border-neutral-200/90 bg-white p-5 shadow-[0_24px_64px_-40px_rgba(0,0,0,0.18)] md:rounded-[2rem] md:p-7 xl:rounded-[2.125rem] xl:p-9">
                <div className="mb-5 flex items-center gap-2 md:mb-6" aria-hidden>
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full transition-[width,background-color,opacity] duration-500 ease-out motion-reduce:transition-none ${
                        i === active
                          ? "w-8 bg-neutral-950"
                          : i < active
                            ? "w-1.5 bg-neutral-400"
                            : "w-1.5 bg-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <StoryVisualStage active={active} count={n} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
