"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { VisualAgendaWeekCard } from "./VisualAgendaWeekCard";
import { VisualCentralHubCard } from "./VisualCentralHubCard";
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
      return <VisualAgendaWeekCard />;
    case 2:
      return <VisualCentralHubCard />;
    default:
      return null;
  }
}

/** Entrée forte : flou + scale + glisse, easing premium. */
function TimelineReveal({
  from,
  children,
}: {
  from: "left" | "right";
  children: (revealed: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (on) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOn(true);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [on]);

  const enterX = from === "left" ? "-translate-x-[clamp(1.5rem,8vw,4rem)]" : "translate-x-[clamp(1.5rem,8vw,4rem)]";

  return (
    <div
      ref={ref}
      className={`transform-gpu will-change-[transform,opacity,filter] transition-[opacity,transform,filter] duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${
        on
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-none"
          : `${enterX} translate-y-14 scale-[0.9] opacity-0 blur-md`
      }`}
    >
      {children(on)}
    </div>
  );
}

function ParcoursCard({
  title,
  text,
  visual,
  revealed,
}: {
  title: string;
  text: string;
  visual: ReactNode;
  revealed: boolean;
}) {
  const base =
    "transform-gpu transition-transform duration-[780ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-y-0 motion-reduce:transition-none";
  const hidden = "translate-y-10";
  const shown = "translate-y-0";

  return (
    <div className="group/card overflow-hidden rounded-[1.65rem] border border-neutral-200/85 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_-32px_rgba(0,0,0,0.16)] transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.22)] motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_-32px_rgba(0,0,0,0.16)] md:rounded-[1.85rem]">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <div
          className={`flex min-h-[200px] items-center justify-center border-b border-neutral-100 bg-gradient-to-b from-[#fafafa] to-neutral-100/40 px-4 py-7 delay-0 md:min-h-[260px] md:w-[46%] md:border-b-0 md:border-r md:border-neutral-100 md:px-5 md:py-9 ${base} ${revealed ? shown : hidden}`}
        >
          <div className="w-full max-w-[300px] md:max-w-none">{visual}</div>
        </div>
        <div
          className={`flex flex-1 flex-col justify-center px-6 py-7 delay-[110ms] md:px-9 md:py-9 md:delay-[140ms] lg:px-10 lg:py-10 ${base} ${revealed ? shown : hidden}`}
        >
          <h3 className="font-display text-2xl font-normal leading-[1.12] tracking-tight text-neutral-950 md:text-[clamp(1.45rem,2.1vw,1.95rem)] lg:text-[2.05rem]">
            {title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 md:mt-5 md:text-lg">{text}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineDot({ active }: { active: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-1/2 z-20 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-500 ease-out md:block motion-reduce:transition-none ${
        active ? "scale-[1.35] shadow-[0_0_0_6px_rgba(0,0,0,0.06),0_12px_40px_-8px_rgba(0,0,0,0.35)]" : "scale-100"
      }`}
      aria-hidden
    />
  );
}

function TimelineDotMobile({ active }: { active: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-[15px] top-1/2 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-neutral-950 transition-[transform,box-shadow] duration-500 ease-out md:hidden motion-reduce:transition-none ${
        active ? "scale-[1.45] shadow-[0_0_0_4px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.3)]" : "scale-100"
      }`}
      aria-hidden
    />
  );
}

function useParallaxAndActiveStep(stepCount: number) {
  const articleRefs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  const raf = useRef<number>(0);

  const setArticleRef = useCallback((index: number) => (node: HTMLElement | null) => {
    articleRefs.current[index] = node;
  }, []);

  const tick = useCallback(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vh = window.innerHeight || 1;
    const focus = vh * 0.48;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < stepCount; i++) {
      const el = articleRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const d = Math.abs(mid - focus);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
      if (reduce) {
        el.style.setProperty("--parcours-lift", "0px");
      } else {
        const py = Math.max(-20, Math.min(20, (mid - vh / 2) * -0.055));
        el.style.setProperty("--parcours-lift", `${py}px`);
      }
    }
    setActive((p) => (p === best ? p : best));
  }, [stepCount]);

  useEffect(() => {
    const loop = () => {
      if (raf.current) return;
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0;
        tick();
      });
    };

    loop();
    window.addEventListener("scroll", loop, { passive: true });
    window.addEventListener("resize", loop, { passive: true });
    return () => {
      window.removeEventListener("scroll", loop);
      window.removeEventListener("resize", loop);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tick, stepCount]);

  return { active, setArticleRef };
}

/**
 * Parcours type taap.it : timeline, cartes alternées, entrées scroll (flou, scale, glide),
 * enchaînement visuel → texte, parallaxe légère, pastille active au centre de l’écran.
 */
export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;
  const { active, setArticleRef } = useParallaxAndActiveStep(steps.length);

  return (
    <section
      id="parcours"
      className={`scroll-mt-28 ${landingDivider} bg-white`}
      aria-labelledby="parcours-aria-title"
    >
      <h2 id="parcours-aria-title" className="sr-only">
        Parcours
      </h2>

      <div className={`${landingSection} py-20 md:py-28 lg:py-32`}>
        <div className="relative mx-auto max-w-6xl">
          <div
            className="pointer-events-none absolute left-1/2 top-8 bottom-10 z-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-neutral-300/90 via-neutral-200 to-neutral-100 md:block"
            aria-hidden
          />

          <div
            className="pointer-events-none absolute bottom-8 left-[15px] top-6 z-0 w-px bg-gradient-to-b from-neutral-300/80 to-neutral-100 md:hidden"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-16 md:gap-24 lg:gap-28">
            {steps.map((step, i) => {
              const from = i % 2 === 0 ? "left" : "right";
              const isRight = i % 2 === 1;
              const isActive = active === i;

              return (
                <article
                  key={step.title}
                  ref={setArticleRef(i)}
                  id={`parcours-etape-${i + 1}`}
                  className="relative grid grid-cols-1 md:grid-cols-2 md:items-center"
                >
                  <TimelineDot active={isActive} />
                  <TimelineDotMobile active={isActive} />

                  <div
                    className={`relative min-w-0 pl-9 md:pl-0 ${isRight ? "md:col-start-2 md:row-start-1" : "md:col-start-1 md:row-start-1"} ${isRight ? "md:pl-8 lg:pl-12" : "md:pr-8 lg:pr-12"}`}
                  >
                    <div
                      className="[transform:translate3d(0,var(--parcours-lift,0px),0)] motion-reduce:!transform-none"
                      style={{ willChange: "transform" }}
                    >
                      <TimelineReveal from={from}>
                        {(revealed) => (
                          <ParcoursCard
                            revealed={revealed}
                            title={step.title}
                            text={step.text}
                            visual={renderVisual(i)}
                          />
                        )}
                      </TimelineReveal>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
