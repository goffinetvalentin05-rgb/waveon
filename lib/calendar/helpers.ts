import type { Birthday, BirthdayOccurrence } from "@/lib/calendar/types";
import {
  CALENDAR_CATEGORIES,
  type CalendarCategory,
  type CalendarEventInput,
} from "@/lib/calendar/types";

export function validateEventInput(body: unknown): {
  data?: CalendarEventInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Corps de requête invalide" };
  }
  const b = body as Record<string, unknown>;
  const title = String(b.title ?? "").trim();
  if (!title) return { error: "Le titre est obligatoire" };

  const category = String(b.category ?? "other");
  if (!CALENDAR_CATEGORIES.includes(category as CalendarCategory)) {
    return { error: "Catégorie invalide" };
  }

  const start_at = String(b.start_at ?? "");
  const end_at = String(b.end_at ?? "");
  if (!start_at || Number.isNaN(Date.parse(start_at))) {
    return { error: "Date de début invalide" };
  }
  if (!end_at || Number.isNaN(Date.parse(end_at))) {
    return { error: "Date de fin invalide" };
  }
  if (new Date(end_at) < new Date(start_at)) {
    return { error: "La fin doit être après le début" };
  }

  const blank = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s || null;
  };

  return {
    data: {
      title,
      category: category as CalendarCategory,
      start_at: new Date(start_at).toISOString(),
      end_at: new Date(end_at).toISOString(),
      all_day: Boolean(b.all_day),
      description: blank(b.description),
      color:
        typeof b.color === "string" && b.color.trim()
          ? b.color.trim()
          : undefined,
      location: blank(b.location),
      source: blank(b.source),
      source_id:
        typeof b.source_id === "string" && b.source_id.trim()
          ? b.source_id.trim()
          : null,
    },
  };
}

export function validateBirthdayInput(body: unknown): {
  data?: {
    person_name: string;
    birth_date: string;
    note: string | null;
    remind_day_before: boolean;
    remind_same_day: boolean;
  };
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Corps de requête invalide" };
  }
  const b = body as Record<string, unknown>;
  const person_name = String(b.person_name ?? "").trim();
  if (!person_name) return { error: "Le nom est obligatoire" };
  const birth_date = String(b.birth_date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
    return { error: "Date de naissance invalide" };
  }
  const note =
    typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;

  return {
    data: {
      person_name,
      birth_date,
      note,
      remind_day_before: b.remind_day_before !== false,
      remind_same_day: b.remind_same_day !== false,
    },
  };
}

/** Prochaine occurrence (année courante ou suivante) pour une date de naissance. */
export function nextBirthdayDate(
  birthDate: string,
  fromISO: string
): string {
  const [, month, day] = birthDate.split("-").map(Number);
  const fy = Number(fromISO.slice(0, 4));

  for (const year of [fy, fy + 1, fy + 2]) {
    const d = new Date(Date.UTC(year, month - 1, day));
    // Feb 29 on non-leap years rolls to March — use Feb 28 instead
    if (d.getUTCMonth() !== month - 1) {
      d.setUTCDate(0);
    }
    const iso = d.toISOString().slice(0, 10);
    if (iso >= fromISO) return iso;
  }

  return `${fy + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function birthdayAgeOn(birthDate: string, onDate: string): number | null {
  const by = Number(birthDate.slice(0, 4));
  const oy = Number(onDate.slice(0, 4));
  if (!by || !oy) return null;
  return Math.max(0, oy - by);
}

export function expandBirthdayOccurrences(
  birthdays: Birthday[],
  rangeStart: string,
  rangeEnd: string
): BirthdayOccurrence[] {
  const out: BirthdayOccurrence[] = [];
  const startY = Number(rangeStart.slice(0, 4));
  const endY = Number(rangeEnd.slice(0, 4));

  for (const b of birthdays) {
    const [, month, day] = b.birth_date.split("-").map(Number);
    for (let year = startY - 1; year <= endY + 1; year++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      // Validate date (skip invalid Feb 29)
      const probe = new Date(`${date}T12:00:00`);
      if (Number.isNaN(probe.getTime())) continue;
      const normalized = probe.toISOString().slice(0, 10);
      if (normalized < rangeStart || normalized > rangeEnd) continue;
      out.push({
        birthdayId: b.id,
        person_name: b.person_name,
        date: normalized,
        note: b.note,
        age: birthdayAgeOn(b.birth_date, normalized),
      });
    }
  }
  return out.sort((a, c) => a.date.localeCompare(c.date));
}

export function daysUntil(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T12:00:00`);
  const b = new Date(`${toISO}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
