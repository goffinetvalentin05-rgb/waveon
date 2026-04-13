/**
 * Design system Wavon — aligné sur la landing (clair, premium, sobre).
 * Ne pas utiliser comme accent principal le vert néon ; hiérarchie noir / gris / blanc.
 */

export const wavonPage =
  "mx-auto w-full max-w-6xl px-4 sm:px-5 md:px-6 lg:px-8";

/** Fond zone contenu principal */
export const wavonMainBg = "bg-[#f7f7f5]";

/** Carte standard (landing-like) */
export const cardClass =
  "rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]";

export const cardClassCompact =
  "rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)]";

/** Carte KPI */
export const kpiCardClass =
  "rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.07)]";

/** Section titre dans une page settings */
export const sectionTitleClass = "text-lg font-semibold tracking-tight text-neutral-950";
export const sectionDescClass = "mt-1 text-sm text-neutral-500";

export const labelClass =
  "block text-xs font-medium uppercase tracking-wide text-neutral-500";

export const inputClass =
  "w-full min-h-[44px] rounded-2xl border border-neutral-200/90 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-950/5";

export const selectClass = inputClass;

/** Select compact (tableaux, filtres) */
export const selectCompactClass =
  "rounded-xl border border-neutral-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-300 focus:ring-2 focus:ring-neutral-950/5";

export const textareaClass =
  "w-full min-h-[100px] rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-950/5";

/** Bouton primaire — noir / blanc (comme landing) */
export const btnPrimaryClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-neutral-800 hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.14)] active:scale-[0.995] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100";

export const btnPrimarySmClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-2 text-xs font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition duration-200 hover:bg-neutral-800 active:scale-[0.995] disabled:opacity-40";

/** Secondaire — bordure */
export const btnSecondaryClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-neutral-200/90 bg-white px-6 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.995] disabled:opacity-40";

/** Ghost / lien bouton */
export const btnGhostClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950";

/** Lien texte */
export const linkClass = "text-sm font-medium text-neutral-950 underline-offset-4 hover:underline";

/** Tableau */
export const tableHeadClass = "border-b border-neutral-200/80 text-left text-xs font-medium uppercase tracking-wide text-neutral-500";
export const tableRowClass = "border-b border-neutral-100 last:border-0 transition hover:bg-neutral-50/80";

/** Badges statut — discrets, pas flashy */
export const badgeConfirmed =
  "inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-xs font-medium text-emerald-900";
export const badgePending =
  "inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-xs font-medium text-amber-900";
export const badgeCancelled =
  "inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600";

/** Spinner */
export const spinnerClass =
  "size-8 rounded-full border-2 border-neutral-200 border-t-neutral-950 motion-safe:animate-spin";

/** États vides */
export const emptyStateBoxClass =
  "rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-12 text-center";

/** Sidebar nav item */
export const sidebarNavInactive =
  "block rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-950";
export const sidebarNavActive =
  "block rounded-xl bg-neutral-950 px-3 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]";

/** Rétrocompat court */
export const WAVON = {
  pageBg: "#f7f7f5",
  card: "#ffffff",
  text: "#0a0a0a",
  muted: "#737373",
  border: "rgba(0,0,0,0.08)",
} as const;
