"use client";

import { brand } from "@/lib/brand/config";
import { IconLink } from "@tabler/icons-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionStyle,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Particules décoratives statiques (positions fixes en %). */
const PARTICLES = [
  { top: "12%", left: "18%", opacity: 0.2 },
  { top: "28%", left: "72%", opacity: 0.15 },
  { top: "55%", left: "10%", opacity: 0.25 },
  { top: "70%", left: "85%", opacity: 0.12 },
  { top: "88%", left: "42%", opacity: 0.18 },
  { top: "40%", left: "50%", opacity: 0.1 },
] as const;

const GLASS =
  "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-purple-500/20 md:rounded-3xl";

type DotTone = "emerald" | "violet" | "orange";

const DOT_STYLES: Record<DotTone, string> = {
  emerald: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]",
  violet: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.55)]",
  orange: "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.55)]",
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

function StatusDot({
  tone,
  pulse = false,
  reduceMotion,
}: {
  tone: DotTone;
  pulse?: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.span
      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[tone]}`}
      aria-hidden
      animate={
        pulse && !reduceMotion
          ? { scale: [1, 1.2, 1] }
          : undefined
      }
      transition={
        pulse && !reduceMotion
          ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    />
  );
}

function GlassSatellite({
  children,
  className = "",
  mountDelay,
  floatDuration,
  floatDelay,
  floatAmplitude,
  reduceMotion,
  rotateX = 0,
  rotateY = 0,
  parallaxStyle,
  extraAnimate,
  extraTransition,
}: {
  children: ReactNode;
  className?: string;
  mountDelay: number;
  floatDuration: number;
  floatDelay: number;
  floatAmplitude: number;
  reduceMotion: boolean;
  rotateX?: number;
  rotateY?: number;
  parallaxStyle?: MotionStyle;
  extraAnimate?: Record<string, number | number[]>;
  extraTransition?: object;
}) {
  const floatY = reduceMotion ? undefined : [-floatAmplitude, 0, -floatAmplitude];

  return (
    <motion.div
      className={className}
      style={parallaxStyle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: mountDelay, ease: "easeOut" }}
    >
      <motion.div
        className={`${GLASS} will-change-transform px-3 py-2.5 md:px-3.5 md:py-3`}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          ...(floatY ? { y: floatY } : {}),
          ...extraAnimate,
        }}
        transition={{
          ...(floatY
            ? {
                y: {
                  duration: floatDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: floatDelay,
                },
              }
            : {}),
          ...extraTransition,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function MatchLiveCard({
  mountDelay,
  floatDuration,
  floatAmplitude,
  reduceMotion,
}: {
  mountDelay: number;
  floatDuration: number;
  floatAmplitude: number;
  reduceMotion: boolean;
}) {
  const floatY = reduceMotion ? undefined : [-floatAmplitude, 0, -floatAmplitude];

  return (
    <motion.div
      className="relative z-10 w-[85%] max-w-[380px] md:w-[380px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: mountDelay, ease: "easeOut" }}
    >
      <motion.article
        className={`${GLASS} will-change-transform px-4 py-4 shadow-purple-500/25 md:px-5 md:py-5`}
        animate={floatY ? { y: floatY } : undefined}
        transition={
          floatY
            ? {
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: mountDelay + 0.15,
              }
            : undefined
        }
      >
      <header className="mb-4 flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-tight text-slate-200">
          {brand.name}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-red-300">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-red-500"
            aria-hidden
            animate={
              reduceMotion ? undefined : { scale: [1, 1.2, 1] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }
          />
          LIVE
        </span>
      </header>

      <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 px-3 py-3">
        <div className="flex items-center justify-between text-2xl md:text-3xl">
          <span aria-hidden>🇫🇷</span>
          <span className="font-display text-lg font-extrabold text-indigo-200 md:text-xl">
            21:00
          </span>
          <span aria-hidden>🇧🇷</span>
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-slate-400">
          France · Brésil
        </p>
        <p className="mt-2 text-center text-sm font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]">
          Ton prono : 2 – 1
        </p>
      </div>

      <div className="space-y-1.5 text-[11px] md:text-xs">
        <div className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-white">
          <span>1 · Toi</span>
          <strong className="text-amber-300">142 pts</strong>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-slate-300/90">
          <span>2 · Max</span>
          <span>128</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-slate-400/80">
          <span>3 · Léa</span>
          <span>119</span>
        </div>
      </div>
      </motion.article>
    </motion.div>
  );
}

function RankBadge({
  mountDelay,
  floatDuration,
  floatDelay,
  floatAmplitude,
  reduceMotion,
  className = "",
  parallaxStyle,
}: {
  mountDelay: number;
  floatDuration: number;
  floatDelay: number;
  floatAmplitude: number;
  reduceMotion: boolean;
  className?: string;
  parallaxStyle?: MotionStyle;
}) {
  const floatY = reduceMotion ? undefined : [-floatAmplitude, 0, -floatAmplitude];

  return (
    <motion.div
      className={className}
      style={parallaxStyle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: mountDelay }}
    >
      <motion.div
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-gradient-to-r from-amber-500/20 to-orange-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-100 will-change-transform backdrop-blur-md md:text-xs"
        animate={floatY ? { y: floatY } : undefined}
        transition={
          floatY
            ? {
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: floatDelay,
              }
            : undefined
        }
      >
        <span className="font-display text-sm text-amber-300">#2</span>
        Classement
      </motion.div>
    </motion.div>
  );
}

export function HeroAnimation() {
  const reduceMotion = useReducedMotion() ?? false;
  const isDesktop = useIsDesktop();
  const stageRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const parallaxEnabled = isDesktop && !reduceMotion;

  // Parallax léger : coefficients différents par carte pour la profondeur
  const px1 = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  const py1 = useTransform(mouseY, [-0.5, 0.5], [-7, 7]);
  const px2 = useTransform(mouseX, [-0.5, 0.5], [8, -8]);
  const py2 = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
  const px3 = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);
  const py3 = useTransform(mouseY, [-0.5, 0.5], [-5, 5]);
  const px4 = useTransform(mouseX, [-0.5, 0.5], [12, -12]);
  const py4 = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const px5 = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);
  const py5 = useTransform(mouseY, [-0.5, 0.5], [5, -5]);

  useEffect(() => {
    if (!parallaxEnabled) return;

    const onMove = (e: MouseEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [parallaxEnabled, mouseX, mouseY]);

  const mobileFloat = 5;
  const desktopFloat = 10;

  const floatAmp = isDesktop ? desktopFloat : mobileFloat;

  const parallax = (x: typeof px1, y: typeof py1): MotionStyle | undefined =>
    parallaxEnabled ? { x, y } : undefined;

  const notificationCard = (
    <GlassSatellite
      mountDelay={0.1}
      floatDuration={5}
      floatDelay={0}
      floatAmplitude={floatAmp}
      reduceMotion={reduceMotion}
      rotateX={-6}
      rotateY={8}
      parallaxStyle={parallax(px1, py1)}
    >
      <div className="flex gap-2">
        <StatusDot tone="emerald" pulse reduceMotion={reduceMotion} />
        <div>
          <p className="text-[11px] font-bold leading-snug text-slate-50 md:text-xs">
            Max a rejoint la ligue
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400 md:text-[10px]">
            Les Sabotards · 8 joueurs
          </p>
        </div>
      </div>
    </GlassSatellite>
  );

  const duelCard = (
    <GlassSatellite
      mountDelay={0.2}
      floatDuration={6}
      floatDelay={0.4}
      floatAmplitude={floatAmp}
      reduceMotion={reduceMotion}
      rotateX={5}
      rotateY={-7}
      parallaxStyle={parallax(px2, py2)}
    >
      <div className="flex gap-2">
        <StatusDot tone="violet" reduceMotion={reduceMotion} />
        <div>
          <p className="text-[11px] font-bold leading-snug text-slate-50 md:text-xs">
            Nouveau duel
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400 md:text-[10px]">
            France vs Brésil · 21:00
          </p>
        </div>
      </div>
    </GlassSatellite>
  );

  const jokerCard = (
    <GlassSatellite
      mountDelay={0.35}
      floatDuration={7}
      floatDelay={0.8}
      floatAmplitude={floatAmp}
      reduceMotion={reduceMotion}
      rotateX={-4}
      rotateY={10}
      parallaxStyle={parallax(px3, py3)}
      extraAnimate={
        reduceMotion
          ? undefined
          : { x: [32, 0, 0, 32], opacity: [0.55, 1, 1, 0.55] }
      }
      extraTransition={
        reduceMotion
          ? undefined
          : {
              x: {
                duration: 8,
                repeat: Infinity,
                times: [0, 0.12, 0.88, 1],
                ease: "easeInOut",
              },
              opacity: {
                duration: 8,
                repeat: Infinity,
                times: [0, 0.12, 0.88, 1],
                ease: "easeInOut",
              },
            }
      }
    >
      <div className="flex gap-2">
        <StatusDot tone="orange" reduceMotion={reduceMotion} />
        <div>
          <p className="text-[11px] font-bold leading-snug text-slate-50 md:text-xs">
            Carte Joker ×2 jouée
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400 md:text-[10px]">
            sur France vs Brésil
          </p>
        </div>
      </div>
    </GlassSatellite>
  );

  const linkCard = (
    <GlassSatellite
      mountDelay={0.45}
      floatDuration={5.5}
      floatDelay={1.1}
      floatAmplitude={floatAmp}
      reduceMotion={reduceMotion}
      rotateX={7}
      rotateY={-5}
      parallaxStyle={parallax(px4, py4)}
    >
      <div className="flex gap-2">
        <IconLink
          size={16}
          stroke={2}
          className="mt-0.5 shrink-0 text-purple-300"
          aria-hidden
        />
        <div>
          <p className="text-[11px] font-bold leading-snug text-slate-50 md:text-xs">
            Lien partagé
          </p>
          <p className="mt-0.5 break-all text-[9px] text-slate-400 md:text-[10px]">
            {brand.domain}/leagues/join
          </p>
        </div>
      </div>
    </GlassSatellite>
  );

  return (
    <div
      className="relative w-full px-6 md:px-0"
      aria-hidden
      ref={stageRef}
    >
      {/* Glow radial + particules */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div
          className="h-[min(420px,70vw)] w-[min(520px,95vw)] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          }}
        />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{
              top: p.top,
              left: p.left,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* ——— Mobile : empilement alterné ——— */}
      <div
        className="relative z-[1] mx-auto flex min-h-[480px] max-w-lg flex-col items-center justify-center gap-3 py-2 md:hidden"
        style={{ perspective: 1200 }}
      >
        <div className="w-full max-w-[220px] self-start">{notificationCard}</div>
        <div className="w-full max-w-[200px] self-end">{duelCard}</div>

        <MatchLiveCard
          mountDelay={0}
          floatDuration={6}
          floatAmplitude={mobileFloat}
          reduceMotion={reduceMotion}
        />

        <div className="w-full max-w-[210px] self-start">{linkCard}</div>
        <div className="w-full self-end">
          <RankBadge
            mountDelay={0.55}
            floatDuration={5}
            floatDelay={0.6}
            floatAmplitude={mobileFloat}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>

      {/* ——— Desktop : composition absolue ——— */}
      <div
        className="relative z-[1] mx-auto hidden h-[700px] max-w-6xl md:block"
        style={{ perspective: 1400 }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <MatchLiveCard
            mountDelay={0}
            floatDuration={6}
            floatAmplitude={desktopFloat}
            reduceMotion={reduceMotion}
          />
        </div>

        <div className="absolute left-[4%] top-[6%] max-w-[200px]">
          {notificationCard}
        </div>
        <div className="absolute right-[3%] top-[4%] max-w-[190px]">
          {duelCard}
        </div>
        <div className="absolute right-0 top-[38%] max-w-[185px]">{jokerCard}</div>
        <div className="absolute left-0 top-[46%] max-w-[200px]">
          {linkCard}
        </div>
        <div className="absolute bottom-[10%] right-[6%]">
          <RankBadge
            mountDelay={0.5}
            floatDuration={4.5}
            floatDelay={0.3}
            floatAmplitude={desktopFloat}
            reduceMotion={reduceMotion}
            parallaxStyle={parallax(px5, py5)}
          />
        </div>
      </div>
    </div>
  );
}
