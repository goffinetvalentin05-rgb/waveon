/** Classes partagées — landing Prono Clash (bleu électrique + glass). */

export const landing = {
  container: "mx-auto w-full max-w-[1200px] px-5 sm:px-6 lg:px-8",
  section: "relative overflow-hidden py-24 sm:py-28 lg:py-32",
  body: "text-[#9ca3af] text-sm sm:text-base leading-relaxed",
  glass:
    "pc-glass-card",
  glassHover: "pc-glass-card-interactive",
  btnPrimary:
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(59,130,246,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] transition-[transform,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_12px_40px_rgba(59,130,246,0.65)] active:scale-[0.98] sm:text-base",
  btnPrimaryLg:
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-[0_12px_48px_rgba(59,130,246,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] transition-[transform,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_16px_56px_rgba(59,130,246,0.7)] active:scale-[0.98] sm:px-10 sm:py-5 sm:text-lg",
  btnSecondary:
    "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:border-blue-500/25 hover:bg-white/[0.06] active:scale-[0.98] sm:text-base",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-blue-200/90 backdrop-blur-sm",
} as const;
