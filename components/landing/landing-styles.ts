/** Classes partagées — landing Prono Clash (bleu électrique + glass). */

export const landing = {
  container: "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8",
  section: "relative overflow-hidden py-20 sm:py-24 lg:py-28",
  body: "text-[#9ca3af] text-sm sm:text-base leading-relaxed",
  glass:
    "rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-[20px] shadow-[inset_0_0_60px_rgba(59,130,246,0.08)]",
  glassHover:
    "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-[0_0_80px_rgba(59,130,246,0.25),inset_0_0_60px_rgba(59,130,246,0.15)]",
  btnPrimary:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_48px_-8px_rgba(59,130,246,0.65)] transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_16px_56px_-6px_rgba(59,130,246,0.8)] active:scale-[0.98] sm:text-base",
  btnPrimaryLg:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_56px_-8px_rgba(59,130,246,0.75)] transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_20px_64px_-6px_rgba(59,130,246,0.9)] active:scale-[0.98] sm:px-10 sm:py-5 sm:text-lg",
  btnSecondary:
    "inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] px-7 py-3.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:border-blue-500/30 hover:bg-white/[0.07] active:scale-[0.98] sm:text-base",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200",
} as const;
