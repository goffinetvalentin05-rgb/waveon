/**
 * Tokens de design Prono Clash (dark / futuriste / gaming).
 *
 * Palette :
 *  - fond : noir profond avec dégradés bleu nuit / violet
 *  - accents : bleu électrique (#3b82f6 → #60a5fa) / violet (#a855f7) / vert néon (#22d3ee → #34d399)
 *  - glassmorphism : bg blanc 5% + blur + border blanc 10%
 */

export const colors = {
  bg: "#05060a",
  bgElevated: "#0b0d18",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#f5f7ff",
  textMuted: "rgba(245,247,255,0.62)",
  textDim: "rgba(245,247,255,0.40)",
  blue: "#3b82f6",
  blueLight: "#60a5fa",
  violet: "#a855f7",
  pink: "#ec4899",
  neon: "#22d3ee",
  neonGreen: "#34d399",
  danger: "#f43f5e",
  warning: "#f59e0b",
} as const;

/** Classes utilitaires réutilisables — façon design system. */
export const ui = {
  /** Conteneur central responsive (mobile-first). */
  container:
    "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8",

  /** Carte verre dépoli. */
  glassCard:
    "relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]",

  /** Carte verre + halo lumineux discret. */
  glowCard:
    "relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(59,130,246,0.35)]",

  /** CTA principal gros, lumineux. */
  btnPrimary:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(59,130,246,0.8)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] sm:text-base",

  btnPrimaryLg:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-7 py-4 text-base font-semibold text-white shadow-[0_12px_50px_-10px_rgba(59,130,246,0.9)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] sm:px-9 sm:py-5 sm:text-lg",

  /** CTA secondaire (verre). */
  btnSecondary:
    "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-white/10 active:scale-[0.98] sm:text-base",

  /** CTA fantôme (lien). */
  btnGhost:
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white",

  /** Badge / chip. */
  badge:
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur",

  badgeAccent:
    "inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200",

  /** Input form. */
  input:
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/30 outline-none transition focus:border-blue-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/30",

  label: "mb-2 block text-sm font-medium text-white/80",

  /** Titres. */
  h1:
    "text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl",
  h2:
    "text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl",
  h3: "text-xl font-semibold tracking-tight text-white sm:text-2xl",

  /** Texte muté. */
  muted: "text-white/60",
  dim: "text-white/40",

  /** Section large. */
  section: "py-20 sm:py-24 lg:py-28",
} as const;

/** Liens / gradients utilitaires pour décorations (halos, traits). */
export const gradients = {
  heroRadial:
    "absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.35)_0%,rgba(29,78,216,0.15)_35%,transparent_70%)]",
  blueViolet: "bg-gradient-to-br from-blue-500 to-blue-700",
  violetNeon: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-400",
  neonLine:
    "h-px w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent",
} as const;
