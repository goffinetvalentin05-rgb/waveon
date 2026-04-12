import { landingBtnPrimary } from "@/components/landing/landing-tokens";

/** Mise en page auth alignée sur la landing (clair, carte premium). */
export const authScreen =
  "relative min-h-screen overflow-x-clip bg-[#f4f4f4] text-neutral-950 antialiased";

export const authMain =
  "mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-14 sm:px-6 sm:py-16";

export const authCard =
  "rounded-[1.75rem] border border-neutral-200/90 bg-white px-7 py-9 shadow-[0_8px_40px_-28px_rgba(0,0,0,0.1),0_2px_8px_-4px_rgba(0,0,0,0.04)] sm:rounded-[2rem] sm:px-8 sm:py-10";

export const authTitle =
  "mt-3 text-balance font-display text-[1.75rem] font-normal leading-[1.12] tracking-[-0.02em] text-neutral-950 sm:text-[2rem]";

export const authSubtitle =
  "mt-2 max-w-[28rem] text-sm leading-relaxed text-neutral-600";

export const authLabel =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500";

export const authInput =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-neutral-400 transition-[border-color,box-shadow] duration-200 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 disabled:opacity-60";

export const authAlertConfig =
  "rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950";

export const authMessage =
  "rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-700";

export const authMessageSuccess =
  "rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-xs leading-relaxed text-emerald-950";

/** Lien secondaire (ex. mot de passe oublié) */
export const authInlineLink =
  "text-xs font-medium text-neutral-600 underline-offset-2 transition-colors hover:text-neutral-950 hover:underline";

export const authFooter = "mt-7 text-center text-sm text-neutral-600";

export const authFooterLink =
  "font-semibold text-neutral-950 underline-offset-2 hover:underline";

export const authBtnPrimaryWide = `${landingBtnPrimary} w-full`;
