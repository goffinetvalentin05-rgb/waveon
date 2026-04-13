import { weeklyDefault } from "./booking-logic";
import type { WavonState } from "./types";

const now = new Date();

function iso(d: Date): string {
  return d.toISOString();
}

function at(hours: number, mins: number, dayOffset = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, mins, 0, 0);
  return d;
}

export function createDefaultWavonState(): WavonState {
  const sCut = {
    id: "svc-cut",
    name: "Coupe + brushing",
    durationMin: 45,
    price: 42,
    description: "Coupe personnalisée et mise en forme.",
  };
  const sBarb = {
    id: "svc-barb",
    name: "Barbe complète",
    durationMin: 30,
    price: 25,
    description: "Taille et finition à la tondeuse et rasoir.",
  };

  const c1 = {
    id: "cl-1",
    name: "Léa Martin",
    phone: "+33 6 12 34 56 78",
    email: "lea@email.com",
  };
  const c2 = {
    id: "cl-2",
    name: "Thomas Durand",
    phone: "+33 6 98 76 54 32",
    email: "thomas@email.com",
  };

  const r1Start = at(10, 0, 0);
  const r1End = new Date(r1Start.getTime() + 45 * 60_000);
  const r2Start = at(14, 30, 1);
  const r2End = new Date(r2Start.getTime() + 30 * 60_000);

  return {
    version: 1,
    weekly: weeklyDefault(),
    availabilityMode: "fixed",
    customDays: [],
    blockedDates: [],
    services: [sCut, sBarb],
    clients: [c1, c2],
    reservations: [
      {
        id: "rsv-1",
        clientId: c1.id,
        clientName: c1.name,
        serviceId: sCut.id,
        start: iso(r1Start),
        end: iso(r1End),
        status: "confirmed",
        createdAt: iso(at(9, 0, -1)),
      },
      {
        id: "rsv-2",
        clientId: c2.id,
        clientName: c2.name,
        serviceId: sBarb.id,
        start: iso(r2Start),
        end: iso(r2End),
        status: "pending",
        createdAt: iso(at(11, 0, -2)),
      },
    ],
    settings: {
      businessName: "Studio Wavon",
      address: "12 rue de la République, 75003 Paris",
      phone: "+33 1 23 45 67 89",
      publicSlug: "demo",
      minServiceDurationMin: 15,
      bookingLeadHours: 0,
      confirmationMode: "manual",
    },
    whatsappThreads: [
      {
        id: "wa-1",
        contactName: "Léa Martin",
        phone: "+33 6 12 34 56 78",
        updatedAt: iso(at(16, 12, 0)),
        messages: [
          {
            id: "m1",
            direction: "in",
            content: "Bonjour, je peux réserver samedi matin ?",
            at: iso(at(16, 10, 0)),
          },
          {
            id: "m2",
            direction: "out",
            content:
              "Bonjour Léa ! Oui, il reste 10h30 et 11h15. Tu préfères quelle heure ?",
            at: iso(at(16, 11, 0)),
          },
        ],
      },
      {
        id: "wa-2",
        contactName: "Thomas Durand",
        phone: "+33 6 98 76 54 32",
        updatedAt: iso(at(14, 0, -1)),
        messages: [
          {
            id: "m3",
            direction: "out",
            content: "Rappel : ton rendez-vous demain à 14h30.",
            at: iso(at(14, 0, -1)),
          },
        ],
      },
    ],
  };
}
