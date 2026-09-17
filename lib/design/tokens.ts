/**
 * Design system Raven — SaaS premium clair.
 * Canvas ivoire, cartes blanches, accent emerald discret.
 */

export const colors = {
  bg: "#F6F6F3",
  sidebar: "#161616",
  surface: "#FFFFFF",
  elevated: "#FBFBFA",
  border: "rgba(20, 20, 20, 0.08)",
  borderStrong: "rgba(20, 20, 20, 0.14)",
  text: "#141414",
  textMuted: "#6B6B6B",
  textDim: "#9A9A9A",
  accent: "#0F9F70",
  accentSoft: "rgba(15, 159, 112, 0.1)",
  danger: "#E11D48",
  warning: "#D97706",
  success: "#0F9F70",
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
  h2: "text-[15px] font-semibold tracking-tight text-wo-text",
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
