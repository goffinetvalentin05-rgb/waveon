/**
 * Design system CRM — inspiré Linear / Notion / Attio.
 * Palette bleu / blanc, minimaliste, beaucoup d'espace.
 */

export const colors = {
  bg: "#f7f9fc",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  border: "#e8eef6",
  borderStrong: "#d0dbeb",
  text: "#0f172a",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  blue: "#2563eb",
  blueLight: "#3b82f6",
  blueSoft: "#eff6ff",
  danger: "#e11d48",
  warning: "#d97706",
  success: "#059669",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8",

  card:
    "rounded-2xl border border-[#e8eef6] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",

  cardInteractive:
    "rounded-2xl border border-[#e8eef6] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.18)]",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50",

  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e8eef6] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50",

  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",

  btnDanger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100",

  input:
    "w-full rounded-xl border border-[#e8eef6] bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20",

  label: "mb-1.5 block text-sm font-medium text-slate-700",

  h1: "text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl",
  h2: "text-lg font-semibold tracking-tight text-slate-900",
  muted: "text-slate-500",
} as const;
