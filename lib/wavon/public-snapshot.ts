import type { WavonState } from "./types";

export type WavonPublicSnapshot = Pick<
  WavonState,
  | "version"
  | "weekly"
  | "availabilityMode"
  | "customDays"
  | "blockedDates"
  | "services"
  | "reservations"
  | "settings"
>;

export function toPublicSnapshot(state: WavonState): WavonPublicSnapshot {
  return {
    version: state.version,
    weekly: state.weekly,
    availabilityMode: state.availabilityMode,
    customDays: state.customDays,
    blockedDates: state.blockedDates,
    services: state.services,
    reservations: state.reservations,
    settings: state.settings,
  };
}

export function snapshotToBookingState(s: WavonPublicSnapshot): WavonState {
  return {
    ...s,
    clients: [],
    whatsappThreads: [],
  };
}

const PREFIX = "wavon-public:";

export function publicStorageKey(slug: string): string {
  return `${PREFIX}${slug.trim().toLowerCase()}`;
}

export function writePublicSnapshot(slug: string, state: WavonState): void {
  if (typeof window === "undefined") return;
  const key = publicStorageKey(slug);
  try {
    localStorage.setItem(key, JSON.stringify(toPublicSnapshot(state)));
  } catch {
    /* quota */
  }
}

export function readPublicSnapshot(slug: string): WavonPublicSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(publicStorageKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as WavonPublicSnapshot;
  } catch {
    return null;
  }
}
