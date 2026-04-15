"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { cardClass, sectionDescClass, sectionTitleClass } from "@/lib/wavon/tokens";
import {
  combineYmdTime,
  getAvailableSlots,
  toYmd,
} from "@/lib/wavon/booking-logic";
import type { Reservation, Service, WavonState } from "@/lib/wavon/types";

function buildBaseState(): WavonState {
  const weekly: WavonState["weekly"] = {
    mon: { enabled: true, segments: [{ start: "09:00", end: "17:00" }] },
    tue: { enabled: false, segments: [] },
    wed: { enabled: false, segments: [] },
    thu: { enabled: false, segments: [] },
    fri: { enabled: false, segments: [] },
    sat: { enabled: false, segments: [] },
    sun: { enabled: false, segments: [] },
  };

  return {
    version: 1,
    weekly,
    availabilityMode: "fixed",
    customDays: [],
    blockedDates: [],
    services: [],
    clients: [],
    reservations: [],
    settings: {
      businessName: "Business test",
      address: "",
      phone: "",
      publicSlug: "test",
      minServiceDurationMin: 5,
      minNoticeHours: 0,
      maxDaysInAdvance: 365,
      slotIntervalMinutes: 15,
      minGapBetweenBookingsMinutes: 0,
      sameDayBookingAllowed: true,
      allowCancellation: true,
      cancellationDeadlineHours: 0,
      allowReschedule: true,
      rescheduleDeadlineHours: 0,
      confirmationMode: "auto",
      publicShowPhone: false,
      publicShowAddress: false,
      publicShowDescription: false,
      publicAfterBookingMessage: "OK",
    },
    emailTemplates: [],
    whatsappThreads: [],
  };
}

function mondayYmdNearNow(): string {
  // Find next Monday (or today if Monday) in local time.
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const target = 1; // Monday
  const delta = (target - day + 7) % 7;
  d.setDate(d.getDate() + delta);
  return toYmd(d);
}

function makeService(partial: Partial<Service> & Pick<Service, "id" | "name" | "durationMin">): Service {
  return {
    id: partial.id,
    name: partial.name,
    durationMin: partial.durationMin,
    price: partial.price ?? 0,
    description: partial.description ?? "",
    isActive: partial.isActive ?? true,
    isPublic: partial.isPublic ?? true,
    color: partial.color ?? null,
    bufferBeforeMin: partial.bufferBeforeMin ?? 0,
    bufferAfterMin: partial.bufferAfterMin ?? 0,
    bookingNoticeHours: partial.bookingNoticeHours ?? null,
    sortOrder: partial.sortOrder ?? 0,
  };
}

function makeReservation(input: {
  id: string;
  serviceId: string;
  ymd: string;
  start: string; // HH:mm
  end: string; // HH:mm
}): Reservation {
  const start = combineYmdTime(input.ymd, input.start).toISOString();
  const end = combineYmdTime(input.ymd, input.end).toISOString();
  return {
    id: input.id,
    clientId: null,
    clientName: "Client",
    serviceId: input.serviceId,
    start,
    end,
    durationMin: 0,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
}

export default function DiagnosticsBookingLogicPage() {
  const { ready, state } = useWavon();
  const ymd = mondayYmdNearNow();

  const base = buildBaseState();
  const svc30 = makeService({ id: "svc30", name: "30min", durationMin: 30 });
  const svc90 = makeService({ id: "svc90", name: "90min", durationMin: 90 });

  const cases = [
    {
      id: "cas-1",
      title: "Cas 1 — lundi 09:00–17:00, service 30 min",
      run: () => {
        const state = { ...base, services: [svc30] };
        const slots = getAvailableSlots(ymd, svc30, state);
        return { ok: slots.length > 0, details: `${slots.length} créneaux` };
      },
    },
    {
      id: "cas-2",
      title: "Cas 2 — pause 12:00–13:00, service 30 min",
      run: () => {
        const state: WavonState = {
          ...base,
          services: [svc30],
          weekly: {
            ...base.weekly,
            mon: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
          },
        };
        const slots = getAvailableSlots(ymd, svc30, state);
        const hasInBreak = slots.some((t) => t >= "12:00" && t < "13:00");
        return { ok: !hasInBreak, details: hasInBreak ? "créneaux dans la pause" : "OK" };
      },
    },
    {
      id: "cas-3",
      title: "Cas 3 — service 90 min",
      run: () => {
        const state = { ...base, services: [svc90] };
        const slots = getAvailableSlots(ymd, svc90, state);
        // Latest possible start: 15:30 (17:00 - 90 min) if step=15
        const hasLate = slots.some((t) => t > "15:30");
        return { ok: slots.length > 0 && !hasLate, details: `${slots.length} créneaux` };
      },
    },
    {
      id: "cas-4",
      title: "Cas 4 — réservation 13:00–13:30, service 30 min",
      run: () => {
        const state: WavonState = {
          ...base,
          services: [svc30],
          reservations: [makeReservation({ id: "r1", serviceId: svc30.id, ymd, start: "13:00", end: "13:30" })],
        };
        const slots = getAvailableSlots(ymd, svc30, state);
        const has1300 = slots.includes("13:00");
        const has1330 = slots.includes("13:30");
        return { ok: !has1300 && has1330, details: `13:00=${has1300} / 13:30=${has1330}` };
      },
    },
    {
      id: "cas-5",
      title: "Cas 5 — réservation 13:00–14:00, service 30 min",
      run: () => {
        const state: WavonState = {
          ...base,
          services: [svc30],
          reservations: [makeReservation({ id: "r2", serviceId: svc30.id, ymd, start: "13:00", end: "14:00" })],
        };
        const slots = getAvailableSlots(ymd, svc30, state);
        const overlaps = slots.some((t) => t >= "13:00" && t < "14:00");
        return { ok: !overlaps, details: overlaps ? "créneaux qui chevauchent" : "OK" };
      },
    },
    {
      id: "cas-6",
      title: "Cas 6 — aucune dispo configurée",
      run: () => {
        const state: WavonState = {
          ...base,
          services: [svc30],
          weekly: { ...base.weekly, mon: { enabled: false, segments: [] } },
        };
        const slots = getAvailableSlots(ymd, svc30, state);
        return { ok: slots.length === 0, details: `${slots.length} créneau` };
      },
    },
  ] as const;

  const results = cases.map((c) => ({ ...c, ...c.run() }));
  const passCount = results.filter((r) => r.ok).length;

  const [realDateYmd, setRealDateYmd] = useState(() => toYmd(new Date()));
  const [realServiceId, setRealServiceId] = useState<string>("");

  const realSvc = useMemo(() => {
    const first = state.services[0]?.id ?? "";
    const id = realServiceId || first;
    return state.services.find((s) => s.id === id) ?? null;
  }, [state.services, realServiceId]);

  const realSlots = useMemo(() => {
    if (!ready || !realSvc) return [];
    return getAvailableSlots(realDateYmd, realSvc, state);
  }, [ready, state, realSvc, realDateYmd]);

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Diagnostics — logique de réservation"
        description="Tests intégrés + aperçu réel de ton business (dispos → créneaux)."
      />

      <section className={cardClass}>
        <h2 className={sectionTitleClass}>Aperçu réel (ton business)</h2>
        <p className={sectionDescClass}>
          Sélectionne un service et une date: on calcule les créneaux avec tes disponibilités, tes réglages et tes réservations.
        </p>

        {!ready ? (
          <p className="mt-6 text-sm text-neutral-500">Chargement…</p>
        ) : state.services.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">Ajoute au moins un service pour tester.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Service</p>
              <select
                className="mt-2 w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none"
                value={realSvc?.id ?? ""}
                onChange={(e) => setRealServiceId(e.target.value)}
              >
                {state.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.durationMin} min
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Date</p>
              <input
                type="date"
                className="mt-2 w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none"
                value={realDateYmd}
                onChange={(e) => setRealDateYmd(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Créneaux</p>
              <div className="mt-2 rounded-2xl border border-neutral-200/90 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-semibold text-neutral-950">{realSlots.length}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Mode: {state.availabilityMode} • Pas: {state.settings.slotIntervalMinutes} min • Gap:{" "}
                  {state.settings.minGapBetweenBookingsMinutes} min
                </p>
              </div>
            </div>

            <div className="sm:col-span-3">
              {realSlots.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Aucun créneau. Vérifie tes disponibilités (jour ouvert + plages) et tes dates bloquées.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {realSlots.slice(0, 24).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
                    >
                      {t}
                    </span>
                  ))}
                  {realSlots.length > 24 ? (
                    <span className="text-xs text-neutral-400">+{realSlots.length - 24} autres…</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h2 className={sectionTitleClass}>Résumé</h2>
        <p className={sectionDescClass}>
          {passCount}/{results.length} cas valides (date de test: {ymd})
        </p>
      </section>

      <section className="grid gap-4">
        {results.map((r) => (
          <div key={r.id} className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">{r.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{r.details}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  r.ok
                    ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
                    : "border-rose-200/80 bg-rose-50 text-rose-900"
                }`}
              >
                {r.ok ? "OK" : "ÉCHEC"}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

