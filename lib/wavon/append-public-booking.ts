import { addMinutes, validateBooking } from "@/lib/wavon/booking-logic";
import type { Reservation, WavonState } from "@/lib/wavon/types";
import {
  publicStorageKey,
  readPublicSnapshot,
  snapshotToBookingState,
  toPublicSnapshot,
} from "@/lib/wavon/public-snapshot";
import { readSlugOwner } from "@/lib/wavon/slug-owner";

function storageKey(userId: string): string {
  return `wavon:v1:${userId}`;
}

/**
 * Ajoute une réservation depuis la page publique : met à jour le snapshot public
 * et, si le professionnel a ouvert le dashboard sur ce navigateur, fusionne dans son stockage.
 */
export function appendPublicBooking(
  slug: string,
  input: {
    clientName: string;
    serviceId: string;
    start: Date;
  }
): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Indisponible côté serveur." };
  }
  const snap = readPublicSnapshot(slug);
  if (!snap) {
    return { ok: false, error: "Page introuvable ou non publiée depuis ce navigateur." };
  }
  const state = snapshotToBookingState(snap);
  const service = state.services.find((s) => s.id === input.serviceId);
  if (!service) {
    return { ok: false, error: "Service invalide." };
  }
  const end = addMinutes(input.start, service.durationMin);
  const status =
    state.settings.confirmationMode === "auto" ? "confirmed" : "pending";
  const err = validateBooking({ state, service, start: input.start, end });
  if (err) {
    return { ok: false, error: err };
  }
  const reservation: Reservation = {
    id: crypto.randomUUID(),
    clientId: null,
    clientName: input.clientName.trim(),
    serviceId: service.id,
    start: input.start.toISOString(),
    end: end.toISOString(),
    status,
    createdAt: new Date().toISOString(),
  };

  const nextRes = [...state.reservations, reservation];
  const nextState: WavonState = { ...state, reservations: nextRes };

  try {
    localStorage.setItem(publicStorageKey(slug), JSON.stringify(toPublicSnapshot(nextState)));
  } catch {
    return { ok: false, error: "Impossible d'enregistrer (stockage plein)." };
  }

  const owner = readSlugOwner(slug);
  if (owner) {
    try {
      const raw = localStorage.getItem(storageKey(owner));
      if (raw) {
        const full = JSON.parse(raw) as WavonState;
        if (full?.version === 1) {
          const merged: WavonState = {
            ...full,
            reservations: [...full.reservations, reservation],
          };
          localStorage.setItem(storageKey(owner), JSON.stringify(merged));
        }
      }
    } catch {
      /* ignore owner sync */
    }
  }

  return { ok: true };
}
