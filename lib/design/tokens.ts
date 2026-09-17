/**
 * Design system Raven — SaaS B2B dark premium.
 * Accent emerald, surfaces vert-noir, densité élevée.
 */

export const colors = {
  bg: "#08110F",
  sidebar: "#0A1512",
  surface: "#0D1916",
  elevated: "#12211D",
  border: "rgba(180, 220, 205, 0.08)",
  borderStrong: "rgba(180, 220, 205, 0.16)",
  text: "#F4F7F6",
  textMuted: "#8FA39C",
  textDim: "#6B8078",
  accent: "#3DD9A4",
  accentSoft: "rgba(61, 217, 164, 0.14)",
  danger: "#F87171",
  warning: "#FBBF24",
  success: "#3DD9A4",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8",

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
  h2: "text-[13px] font-semibold tracking-tight text-wo-text",
  muted: "text-wo-muted",
  kicker: "wo-kicker",

  overlay: "wo-overlay",
  modal: "wo-modal",
  modalHeader: "wo-modal-header",

  subNav: "wo-subnav mb-5",
  subNavActive: "wo-subnav-active",
  subNavIdle: "wo-subnav-idle",

  link: "wo-link",

  alertSuccess: "wo-alert-success",
  alertError: "wo-alert-error",
  alertInfo: "wo-alert-info",

  statCard: "wo-stat",
  widget: "wo-widget",
} as const;
