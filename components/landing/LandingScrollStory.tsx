"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

/** Révélation au scroll : glisse depuis la gauche ou la droite (réf. taap.it). */
function TimelineReveal({ from, children }: { from: "left" | "right"; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOn(true);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const enterX = from === "left" ? "-translate-x-10" : "translate-x-10";

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        on ? "translate-x-0 translate-y-0 opacity-100" : `${enterX} translate-y-7 opacity-0`
      }`}
    >
      {children}
    </div>
  );
}

function ParcoursCard({ title, text, visual }: { title: string; text: string; visual: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-neutral-200/85 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_56px_-28px_rgba(0,0,0,0.14)] transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.16)] motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_56px_-28px_rgba(0,0,0,0.14)] md:rounded-[1.85rem]">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <div className="flex min-h-[200px] items-center justify-center border-b border-neutral-100 bg-[#fafafa] px-4 py-7 md:min-h-[260px] md:w-[46%] md:border-b-0 md:border-r md:border-neutral-100 md:px-5 md:py-9">
          <div className="w-full max-w-[300px] md:max-w-none">{visual}</div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 py-7 md:px-9 md:py-9 lg:px-10 lg:py-10">
          <h3 className="font-display text-2xl font-normal leading-[1.12] tracking-tight text-neutral-950 md:text-[clamp(1.45rem,2.1vw,1.95rem)] lg:text-[2.05rem]">
            {title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 md:mt-5 md:text-lg">{text}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Parcours type taap.it : axe vertical, pastilles, cartes alternées (visuel + texte),
 * entrées au scroll (fondu + glissement).
 */
export function LandingScrollStory({ content }: LandingScrollStoryProps) {
  const { steps } = content;

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
          {/* Ligne verticale — desktop : centre */}
          <div
            className="pointer-events-none absolute left-1/2 top-8 bottom-10 z-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-neutral-200 via-neutral-200 to-neutral-100 md:block"
            aria-hidden
          />

          {/* Ligne verticale — mobile : gauche */}
          <div
            className="pointer-events-none absolute bottom-8 left-[15px] top-6 z-0 w-px bg-neutral-200 md:hidden"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-16 md:gap-24 lg:gap-28">
            {steps.map((step, i) => {
              const from = i % 2 === 0 ? "left" : "right";
              const isRight = i % 2 === 1;

              return (
                <article
                  key={step.title}
                  id={`parcours-etape-${i + 1}`}
                  className="relative grid grid-cols-1 md:grid-cols-2 md:items-center"
                >
                  {/* Pastille sur l’axe — desktop (milieu de la ligne de cette étape) */}
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] md:block"
                    aria-hidden
                  />

                  {/* Pastille — mobile */}
                  <div
                    className="pointer-events-none absolute left-[15px] top-1/2 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-neutral-950 md:hidden"
                    aria-hidden
                  />

                  <div
                    className={`relative min-w-0 pl-9 md:pl-0 ${isRight ? "md:col-start-2 md:row-start-1" : "md:col-start-1 md:row-start-1"} ${isRight ? "md:pl-8 lg:pl-12" : "md:pr-8 lg:pr-12"}`}
                  >
                    <TimelineReveal from={from}>
                      <ParcoursCard title={step.title} text={step.text} visual={renderVisual(i)} />
                    </TimelineReveal>
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
