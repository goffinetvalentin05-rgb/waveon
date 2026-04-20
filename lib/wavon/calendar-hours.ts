import { toYmd } from "@/lib/wavon/booking-logic";
import type { DayKey, WavonState } from "@/lib/wavon/types";

const DOW_MAP: Record<number, DayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function dayKeyFromDate(d: Date): DayKey {
  return DOW_MAP[d.getDay()] ?? "mon";
}

export function getSegmentsForCalendarDate(
  state: WavonState,
  date: Date
): { start: string; end: string }[] {
  if (state.availabilityMode === "custom") {
    const ymd = toYmd(date);
    return state.customDays.find((c) => c.date === ymd)?.segments ?? [];
  }
  const key = dayKeyFromDate(date);
  const day = state.weekly[key];
  if (!day?.enabled) return [];
  return day.segments ?? [];
}

export function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function calendarBoundsForRange(
  state: WavonState,
  from: Date,
  to: Date
): { min: Date; max: Date } {
  let minM = 24 * 60;
  let maxM = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  while (cur.getTime() <= end.getTime()) {
    const segs = getSegmentsForCalendarDate(state, cur);
    for (const s of segs) {
      minM = Math.min(minM, parseHM(s.start));
      maxM = Math.max(maxM, parseHM(s.end));
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (minM >= maxM) {
    minM = 8 * 60;
    maxM = 20 * 60;
  }
  const base = new Date(1970, 0, 1);
  return {
    min: new Date(base.getTime() + minM * 60 * 1000),
    max: new Date(base.getTime() + maxM * 60 * 1000),
  };
}

export function isSlotOutsideBusiness(state: WavonState, slotDate: Date): boolean {
  const segs = getSegmentsForCalendarDate(state, slotDate);
  if (segs.length === 0) return true;
  const m = minutesFromMidnight(slotDate);
  return !segs.some((s) => m >= parseHM(s.start) && m < parseHM(s.end));
}
