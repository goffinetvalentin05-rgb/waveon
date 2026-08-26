/**
 * Design system WaveOne — SaaS premium clair.
 * Accent indigo, surfaces blanches, ombres très légères.
 */

export const colors = {
  bg: "#F7F8FB",
  sidebar: "#FFFFFF",
  surface: "#FFFFFF",
  elevated: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.08)",
  borderStrong: "rgba(15, 23, 42, 0.14)",
  text: "#0F172A",
  textMuted: "#64748B",
  textDim: "#94A3B8",
  accent: "#6366F1",
  accentSoft: "rgba(99, 102, 241, 0.12)",
  danger: "#E11D48",
  warning: "#D97706",
  success: "#059669",
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
  h2: "text-base font-semibold tracking-tight text-wo-text",
  muted: "text-wo-muted",
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
