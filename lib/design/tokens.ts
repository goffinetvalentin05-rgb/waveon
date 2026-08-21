/**
 * Design system WaveOne — cockpit dark premium.
 * Tokens visuels : émeraude / teal, glass, glow subtil.
 */

export const colors = {
  bg: "#0a0a0a",
  sidebar: "#121212",
  surface: "#141414",
  elevated: "#1c1c1c",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#f3f4f3",
  textMuted: "#8d8f8e",
  textDim: "#6a6c6b",
  accent: "#3dff8a",
  accentSoft: "rgba(61,255,138,0.12)",
  danger: "#fb7185",
  warning: "#fbbf24",
  success: "#3dff8a",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8",

  card: "wo-card",
  cardInteractive: "wo-card wo-card-interactive",
  cardFeatured: "wo-card-featured",
  cardCta: "wo-card-cta",

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
