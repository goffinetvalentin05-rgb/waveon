/**
 * Design system Waveone — cockpit dark premium.
 * Inspiré Linear / Attio / Raycast.
 */

export const colors = {
  bg: "#0b0a10",
  sidebar: "#0d0b13",
  surface: "#14121c",
  elevated: "#1a1824",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  text: "#f3f0fa",
  textMuted: "#8b869c",
  textDim: "#6a6578",
  accent: "#8b5cf6",
  accentSoft: "rgba(139,92,246,0.14)",
  danger: "#f43f5e",
  warning: "#fbbf24",
  success: "#34d399",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8",

  card:
    "rounded-[14px] border border-white/[0.07] bg-[#14121c]",

  cardInteractive:
    "rounded-[14px] border border-white/[0.07] bg-[#14121c] transition hover:border-white/[0.12] hover:bg-[#1a1824]",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-[12px] bg-violet-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 active:scale-[0.98] disabled:opacity-50",

  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-[#d8d4e4] transition hover:bg-white/[0.06] hover:text-white active:scale-[0.98] disabled:opacity-50",

  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-[12px] px-3 py-2 text-sm font-medium text-[#8b869c] transition hover:bg-white/[0.05] hover:text-[#f3f0fa]",

  btnDanger:
    "inline-flex items-center justify-center gap-2 rounded-[12px] border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20",

  iconBtn:
    "inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[#8b869c] transition hover:bg-white/[0.06] hover:text-[#f3f0fa]",

  input:
    "w-full rounded-[12px] border border-white/[0.08] bg-[#0f0d16] px-3.5 py-2.5 text-sm text-[#f3f0fa] placeholder:text-[#6a6578] outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20",

  label: "mb-1.5 block text-sm font-medium text-[#c8c3d6]",

  h1: "text-[1.65rem] font-semibold tracking-tight text-[#f3f0fa] sm:text-[1.85rem]",
  h2: "text-base font-semibold tracking-tight text-[#f3f0fa]",
  muted: "text-[#8b869c]",

  overlay: "absolute inset-0 bg-black/65 backdrop-blur-sm",
  modal:
    "relative w-full overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#16141f]",
  modalHeader:
    "flex items-center justify-between border-b border-white/[0.06] px-6 py-4",

  subNav:
    "mb-6 flex gap-1 overflow-x-auto rounded-[14px] border border-white/[0.06] bg-[#14121c] p-1",
  subNavActive: "bg-violet-500/15 text-violet-200",
  subNavIdle: "text-[#8b869c] hover:bg-white/[0.04] hover:text-[#f3f0fa]",

  link: "text-violet-400 transition hover:text-violet-300",

  alertSuccess:
    "rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300",
  alertError:
    "rounded-[12px] border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300",
  alertInfo:
    "rounded-[12px] border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200",

  statCard:
    "rounded-[14px] border border-white/[0.07] border-t-2 border-t-violet-500/80 bg-[#14121c] px-4 py-3.5",

  widget:
    "flex flex-col rounded-[14px] border border-white/[0.07] bg-[#14121c]",
} as const;
