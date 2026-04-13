/** Design system Wavon — dashboard (dark + vert néon) */
export const WAVON = {
  bg: "#000000",
  surface: "#0a0a0a",
  surface2: "#111111",
  border: "rgba(34, 197, 94, 0.18)",
  accent: "#22c55e",
  accentMuted: "rgba(34, 197, 94, 0.12)",
  accentGlow: "0 0 24px rgba(34, 197, 94, 0.15)",
} as const;

export const cardClass =
  "rounded-2xl border border-emerald-500/15 bg-[#0a0a0a] p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow] duration-300 hover:border-emerald-500/25 hover:shadow-[0_0_32px_-8px_rgba(34,197,94,0.12)]";

export const inputClass =
  "w-full rounded-xl border border-emerald-500/20 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30";

export const btnPrimaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(34,197,94,0.45)] transition hover:bg-emerald-400 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

export const btnGhostClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-transparent px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-emerald-500/40 hover:bg-emerald-500/5";
