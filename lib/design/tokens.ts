/**
 * Design system WaveOne — cockpit dark premium.
 * Tokens visuels : émeraude / teal, glass, glow subtil.
 */

export const colors = {
  bg: "#06110e",
  sidebar: "#071412",
  surface: "#0c1916",
  elevated: "#12211d",
  border: "rgba(134,239,172,0.1)",
  borderStrong: "rgba(134,239,172,0.18)",
  text: "#eef6f2",
  textMuted: "#8a9e96",
  textDim: "#6b7d76",
  accent: "#10b981",
  accentSoft: "rgba(16,185,129,0.14)",
  danger: "#fb7185",
  warning: "#fbbf24",
  success: "#34d399",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8",

  card: "wo-card",
  cardInteractive: "wo-card wo-card-interactive",
  cardFeatured: "wo-card-featured",

  btnPrimary: "wo-btn wo-btn-primary",
  btnSecondary: "wo-btn wo-btn-secondary",
  btnGhost: "wo-btn wo-btn-ghost",
  btnDanger: "wo-btn wo-btn-danger",
  iconBtn: "wo-icon-btn",

  input: "wo-input w-full",
  label: "wo-label",

  h1: "wo-h1",
  h2: "text-base font-semibold tracking-tight text-[#eef6f2]",
  muted: "text-[#8a9e96]",
  kicker: "wo-kicker",

  overlay: "wo-overlay",
  modal: "wo-modal",
  modalHeader: "wo-modal-header",

  subNav: "wo-subnav mb-6",
  subNavActive: "wo-subnav-active",
  subNavIdle: "wo-subnav-idle",

  link: "wo-link",

  alertSuccess: "wo-alert-success",
  alertError: "wo-alert-error",
  alertInfo: "wo-alert-info",

  statCard: "wo-stat",
  widget: "wo-widget",
} as const;
