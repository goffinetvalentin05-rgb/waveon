/**
 * Design system Raven — dark premium.
 * Noir profond, halos emerald/amber, surfaces en relief.
 */

export const colors = {
  bg: "#0A0B0B",
  sidebar: "#0D0E0E",
  surface: "#131415",
  elevated: "#191B1C",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  text: "#F2F4F3",
  textMuted: "#969D9A",
  textDim: "#6E7674",
  accent: "#34D399",
  accentSoft: "rgba(52, 211, 153, 0.13)",
  amber: "#F0A868",
  danger: "#FB7185",
  warning: "#FBBF24",
  success: "#34D399",
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
