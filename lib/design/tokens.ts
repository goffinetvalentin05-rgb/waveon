/**
 * Design system Raven — dark warm premium.
 * Noir chaud, surfaces brun-noir, accents cuivre.
 */

export const colors = {
  bg: "#0B0907",
  sidebar: "#0D0B09",
  surface: "#15110E",
  elevated: "#181310",
  surface2: "#1D1713",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  text: "#F7F3EE",
  textMuted: "#8F8780",
  textDim: "#6E6760",
  accent: "#D97732",
  accentSoft: "rgba(217, 119, 50, 0.14)",
  amber: "#E5843A",
  danger: "#FB7185",
  warning: "#FBBF24",
  success: "#8FBF7A",
} as const;

export const ui = {
  container: "mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8",

  card: "wo-card",
  cardInteractive: "wo-card wo-card-interactive",
  cardAccent: "wo-card wo-card-accent",
  cardFeatured: "wo-card-featured",
  cardCta: "wo-card-cta",
  hero: "wo-hero",

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

  row: "wo-row",
  tile: "wo-tile",
  segment: "wo-segment",
  segmentItem: "wo-segment-item",
  segmentItemActive: "wo-segment-item wo-segment-item-active",

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
