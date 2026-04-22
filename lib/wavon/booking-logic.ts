import {
  type AvailabilityMode,
  type CustomDaySlot,
  type DayKey,
  type Reservation,
  type Service,
  type TimeSegment,
  type WeeklyDaySchedule,
  type WavonState,
} from "./types";

export function dayKeyFromDate(d: Date): DayKey {
  const js = d.getDay();
  const map: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[js] ?? "mon";
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Minutes depuis minuit pour "HH:mm" */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function atLocalDayMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function combineYmdTime(ymd: string, time: string): Date {
  const base = parseYmd(ymd);
  const mins = timeToMinutes(time);
  base.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return base;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Réservations actives (bloquent le planning) */
export function activeReservations(list: Reservation[]): Reservation[] {
  return list.filter((r) => r.status === "confirmed" || r.status === "pending");
}

export function overlapsAnyReservation(
  start: Date,
  end: Date,
  reservations: Reservation[],
  ignoreId?: string,
  minGapBetweenBookingsMinutes = 0
): boolean {
  const gap = Math.max(0, minGapBetweenBookingsMinutes || 0);
  return activeReservations(reservations).some((r) => {
    if (ignoreId && r.id === ignoreId) return false;
    const rs = addMinutes(
      new Date(r.start),
      -Math.max(0, (r.bufferBeforeMin || 0) + gap)
    );
    const re = addMinutes(
      new Date(r.end),
      Math.max(0, (r.bufferAfterMin || 0) + gap)
    );
    return rangesOverlap(start, end, rs, re);
  });
}

function segmentsForDate(
  mode: AvailabilityMode,
  weekly: Record<DayKey, WeeklyDaySchedule>,
  customDays: CustomDaySlot[],
  ymd: string,
  dayKey: DayKey
): TimeSegment[] {
  if (mode === "custom") {
    const row = customDays.find((c) => c.date === ymd);
    // If no custom day exists, fallback to weekly schedule.
    if (row) return row.segments ?? [];
  }
  const day = weekly[dayKey];
  if (!day?.enabled) return [];
  return day.segments.filter(
    (s) => timeToMinutes(s.end) > timeToMinutes(s.start)
  );
}

export function isDateBlocked(ymd: string, blocked: string[]): boolean {
  return blocked.includes(ymd);
}

/** Le créneau [start,end) est entièrement dans au moins un segment du jour */
export function isWithinSegments(
  start: Date,
  end: Date,
  segments: TimeSegment[],
  ymd: string
): boolean {
  if (segments.length === 0) return false;
  const dayStart = parseYmd(ymd);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  if (start < dayStart || end > dayEnd) return false;

  const sm = atLocalDayMinutes(start);
  const em = atLocalDayMinutes(end);
  if (em <= sm) return false;

  return segments.some((seg) => {
    const a = timeToMinutes(seg.start);
    const b = timeToMinutes(seg.end);
    return a <= sm && em <= b;
  });
}

export function validateReservationWindow(
  start: Date,
  service: Service,
  settings: WavonState["settings"]
): string | null {
  const notice = Math.max(
    0,
    service.bookingNoticeHours ?? settings.minNoticeHours ?? 0
  );
  const leadMs = notice * 60 * 60 * 1000;
  if (start.getTime() < Date.now() + leadMs) {
    return `La première réservation possible est dans ${notice} h (délai de réservation).`;
  }
  if (!settings.sameDayBookingAllowed) {
    const now = new Date();
    const sameDay =
      now.getFullYear() === start.getFullYear() &&
      now.getMonth() === start.getMonth() &&
      now.getDate() === start.getDate();
    if (sameDay) return "La réservation le jour même n’est pas autorisée.";
  }
  if (settings.maxDaysInAdvance !== undefined && settings.maxDaysInAdvance >= 0) {
    const maxMs = settings.maxDaysInAdvance * 24 * 60 * 60 * 1000;
    if (start.getTime() > Date.now() + maxMs) {
      return `La réservation est limitée à ${settings.maxDaysInAdvance} jours à l’avance.`;
    }
  }
  return null;
}

export type BookingValidationContext = {
  state: WavonState;
  service: Service;
  start: Date;
  end: Date;
  employeeId?: string | null;
  ignoreReservationId?: string;
};

export function validateBooking(ctx: BookingValidationContext): string | null {
  const { state, service, start, end, ignoreReservationId, employeeId } = ctx;
  const ymd = toYmd(start);
  if (isDateBlocked(ymd, state.blockedDates)) {
    return "Cette date est bloquée.";
  }
  const dk = dayKeyFromDate(start);
  const segments = segmentsForDate(
    state.availabilityMode,
    state.weekly,
    state.customDays,
    ymd,
    dk
  );
  if (!isWithinSegments(start, end, segments, ymd)) {
    return "Hors des disponibilités.";
  }
  const win = validateReservationWindow(start, service, state.settings);
  if (win) return win;
  const gap = Math.max(0, state.settings.minGapBetweenBookingsMinutes || 0);
  const busyStart = addMinutes(
    start,
    -Math.max(0, (service.bufferBeforeMin || 0) + gap)
  );
  const busyEnd = addMinutes(
    end,
    Math.max(0, (service.bufferAfterMin || 0) + gap)
  );
  const reservations =
    employeeId === undefined
      ? state.reservations
      : state.reservations.filter((r) => (r.employeeId ?? null) === (employeeId ?? null));
  if (
    overlapsAnyReservation(
      busyStart,
      busyEnd,
      reservations,
      ignoreReservationId,
      gap
    )
  ) {
    return "Chevauchement avec une autre réservation.";
  }
  return null;
}

export function getAvailableSlots(
  ymd: string,
  service: Service,
  state: WavonState,
  employeeId?: string | null
): string[] {
  if (isDateBlocked(ymd, state.blockedDates)) return [];
  const day = parseYmd(ymd);
  const dk = dayKeyFromDate(day);
  const segments = segmentsForDate(
    state.availabilityMode,
    state.weekly,
    state.customDays,
    ymd,
    dk
  );
  if (segments.length === 0) return [];

  const slots: string[] = [];
  const duration = service.durationMin;
  const step = Math.max(5, state.settings.slotIntervalMinutes || 15);

  for (const seg of segments) {
    let cur = timeToMinutes(seg.start);
    const max = timeToMinutes(seg.end);
    while (cur + duration <= max) {
      const start = combineYmdTime(ymd, minutesToTime(cur));
      const end = addMinutes(start, duration);
      const err = validateBooking({
        state,
        service,
        start,
        end,
        employeeId,
      });
      if (!err) {
        slots.push(minutesToTime(cur));
      }
      cur += step;
    }
  }
  return slots;
}

/** Segments valides : pas de chevauchement interne, fin > début */
export function validateSegments(segments: TimeSegment[]): string | null {
  const norm = segments
    .map((s) => ({
      a: timeToMinutes(s.start),
      b: timeToMinutes(s.end),
    }))
    .filter((x) => x.b > x.a)
    .sort((x, y) => x.a - y.a);
  for (let i = 1; i < norm.length; i++) {
    if (norm[i]!.a < norm[i - 1]!.b) {
      return "Les plages horaires se chevauchent.";
    }
  }
  for (const s of segments) {
    if (timeToMinutes(s.end) <= timeToMinutes(s.start)) {
      return "Chaque plage doit se terminer après son début.";
    }
  }
  return null;
}

export function weeklyDefault(): Record<DayKey, WeeklyDaySchedule> {
  const base = (): WeeklyDaySchedule => ({
    enabled: false,
    segments: [{ start: "09:00", end: "18:00" }],
  });
  return {
    mon: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
    tue: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
    wed: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
    thu: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
    fri: { enabled: true, segments: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
    sat: base(),
    sun: base(),
  };
}

export function fillRateWeekApprox(state: WavonState, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = addMinutes(start, 7 * 24 * 60);
  const weekRes = activeReservations(state.reservations).filter((r) => {
    const t = new Date(r.start).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const bookedMin = weekRes.reduce((acc, r) => {
    const dur =
      (new Date(r.end).getTime() - new Date(r.start).getTime()) / 60_000;
    return acc + Math.max(0, dur);
  }, 0);

  let openMin = 0;
  for (let i = 0; i < 7; i++) {
    const d = addMinutes(start, i * 24 * 60);
    const ymd = toYmd(d);
    const dk = dayKeyFromDate(d);
    const segs = segmentsForDate(
      state.availabilityMode,
      state.weekly,
      state.customDays,
      ymd,
      dk
    );
    for (const s of segs) {
      openMin += Math.max(0, timeToMinutes(s.end) - timeToMinutes(s.start));
    }
  }
  if (openMin <= 0) return 0;
  return Math.min(100, Math.round((bookedMin / openMin) * 100));
}
