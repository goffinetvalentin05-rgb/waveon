import { addMinutes, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { dateOnly, parseDateOnly } from "@/lib/crm/date-only";

export const DEMO_CALENDAR_SOURCE = "crm";
export const DEMO_REMINDER_TASK_KIND = "demo_reminder";
export const DEMO_REMINDER_NEXT_ACTION = "Envoyer le rappel de démo";

export const DEMO_DURATION_OPTIONS = [15, 30, 45, 60] as const;

export const DEMO_REMINDER_PRESETS = [
  { id: "none", label: "Aucun rappel", daysBefore: null },
  { id: "1d", label: "1 jour avant", daysBefore: 1 },
  { id: "2d", label: "2 jours avant", daysBefore: 2 },
  { id: "3d", label: "3 jours avant", daysBefore: 3 },
  { id: "7d", label: "1 semaine avant", daysBefore: 7 },
  { id: "custom", label: "Date personnalisée", daysBefore: null },
] as const;

export type DemoReminderPresetId = (typeof DEMO_REMINDER_PRESETS)[number]["id"];

export type DemoScheduleInput = {
  demoDate: string;
  demoTime: string;
  durationMin: number;
  reminderPreset: DemoReminderPresetId;
  reminderDate?: string | null;
  note?: string | null;
};

export type ResolvedDemoSchedule = {
  demoAt: string;
  endAt: string;
  demoDate: string;
  demoTime: string;
  durationMin: number;
  reminderOn: string | null;
  nextFollowUp: string;
  nextAction: string;
  note: string | null;
};

export function isDemoReminderPreset(value: string): value is DemoReminderPresetId {
  return DEMO_REMINDER_PRESETS.some((item) => item.id === value);
}

export function formatDurationLabel(minutes: number): string {
  if (minutes === 60) return "1 h";
  if (minutes > 60 && minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}

export function shiftDateOnly(value: string, days: number): string {
  const d = parseDateOnly(value);
  d.setDate(d.getDate() + days);
  return dateOnly(d);
}

export function localDateTimeToIso(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}`).toISOString();
}

export function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dateOnly(iso);
  return dateOnly(d);
}

export function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "14:00";
  return format(d, "HH:mm");
}

export function resolveReminderDate(
  demoDate: string,
  preset: DemoReminderPresetId,
  customDate?: string | null
): string | null {
  if (preset === "none") return null;
  if (preset === "custom") {
    const custom = customDate ? dateOnly(customDate) : null;
    return custom && /^\d{4}-\d{2}-\d{2}$/.test(custom) ? custom : null;
  }
  const option = DEMO_REMINDER_PRESETS.find((item) => item.id === preset);
  if (!option?.daysBefore) return null;
  return shiftDateOnly(demoDate, -option.daysBefore);
}

export function inferReminderPreset(demoDate: string, reminderOn: string | null): DemoReminderPresetId {
  if (!reminderOn) return "none";
  for (const option of DEMO_REMINDER_PRESETS) {
    if (!option.daysBefore) continue;
    if (shiftDateOnly(demoDate, -option.daysBefore) === reminderOn) return option.id;
  }
  return "custom";
}

export function validateDemoScheduleInput(input: DemoScheduleInput): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.demoDate)) return "La date de la démo est obligatoire.";
  if (!/^\d{2}:\d{2}$/.test(input.demoTime)) return "L’heure de la démo est obligatoire.";
  if (!Number.isFinite(input.durationMin) || input.durationMin < 5) {
    return "La durée de la démo est invalide.";
  }
  if (!isDemoReminderPreset(input.reminderPreset)) return "Rappel invalide.";
  const reminderOn = resolveReminderDate(input.demoDate, input.reminderPreset, input.reminderDate);
  if (input.reminderPreset !== "none" && !reminderOn) {
    return "Indiquez la date du rappel.";
  }
  if (reminderOn && reminderOn >= input.demoDate) {
    return "Le rappel doit être avant la date de la démo.";
  }
  return null;
}

export function resolveDemoSchedule(input: DemoScheduleInput): ResolvedDemoSchedule {
  const error = validateDemoScheduleInput(input);
  if (error) throw new Error(error);

  const demoAt = localDateTimeToIso(input.demoDate, input.demoTime);
  const endAt = addMinutes(parseISO(demoAt), input.durationMin).toISOString();
  const reminderOn = resolveReminderDate(input.demoDate, input.reminderPreset, input.reminderDate);
  const note = input.note?.trim() || null;
  const nextFollowUp = reminderOn ?? input.demoDate;
  const nextAction = reminderOn
    ? DEMO_REMINDER_NEXT_ACTION
    : `Démo planifiée · ${input.demoTime}`;

  return {
    demoAt,
    endAt,
    demoDate: input.demoDate,
    demoTime: input.demoTime,
    durationMin: input.durationMin,
    reminderOn,
    nextFollowUp,
    nextAction,
    note,
  };
}

export function demoEventTitle(clubName: string): string {
  return `Démo — ${clubName}`;
}

export function demoReminderTitle(clubName: string): string {
  return `Envoyer le rappel de démo — ${clubName}`;
}

export function isDemoReminderNextAction(value: string | null | undefined): boolean {
  return (value ?? "").startsWith("Envoyer le rappel de démo");
}

export function nextActionAfterReminderDone(demoAt: string): { nextFollowUp: string; nextAction: string } {
  return {
    nextFollowUp: isoToLocalDate(demoAt),
    nextAction: `Démo planifiée · ${isoToLocalTime(demoAt)}`,
  };
}

export function formatDemoHistoryBody(schedule: Pick<ResolvedDemoSchedule, "demoAt" | "durationMin" | "note">): string {
  const start = new Date(schedule.demoAt);
  const when = Number.isNaN(start.getTime())
    ? schedule.demoAt
    : format(start, "d MMMM yyyy · HH:mm", { locale: fr });
  const lines = [when, `Durée : ${formatDurationLabel(schedule.durationMin)}`];
  if (schedule.note) lines.push(schedule.note);
  return lines.join("\n");
}

export function formatDemoEventDescription(input: {
  clubName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  durationMin: number;
  note?: string | null;
}): string {
  const lines = [
    `Prospect : ${input.clubName}`,
    input.contactName ? `Contact : ${input.contactName}` : null,
    input.phone ? `Téléphone : ${input.phone}` : null,
    input.email ? `Email : ${input.email}` : null,
    `Durée : ${formatDurationLabel(input.durationMin)}`,
    input.note ? `\nNote / préparation :\n${input.note}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function parseDemoScheduleDescription(description: string | null | undefined): {
  demoAt: string | null;
  durationMin: number;
  reminderOn: string | null;
  note: string | null;
} {
  const fallback = { demoAt: null as string | null, durationMin: 30, reminderOn: null as string | null, note: null as string | null };
  if (!description?.trim().startsWith("{")) {
    return { ...fallback, note: description?.trim() || null };
  }
  try {
    const obj = JSON.parse(description) as Record<string, unknown>;
    const demoAtRaw = obj.demoAt ?? obj.demo_at;
    const durationRaw = obj.durationMin ?? obj.duration_min;
    const reminderRaw = obj.reminderOn ?? obj.reminder_on;
    const note = typeof obj.note === "string" && obj.note.trim() ? obj.note.trim() : null;
    return {
      demoAt: typeof demoAtRaw === "string" && demoAtRaw ? demoAtRaw : null,
      durationMin: typeof durationRaw === "number" && durationRaw > 0 ? durationRaw : 30,
      reminderOn: typeof reminderRaw === "string" && reminderRaw ? dateOnly(reminderRaw) : null,
      note,
    };
  } catch {
    return fallback;
  }
}

export function serializeDemoScheduleDescription(schedule: ResolvedDemoSchedule): string {
  return JSON.stringify({
    demoAt: schedule.demoAt,
    durationMin: schedule.durationMin,
    reminderOn: schedule.reminderOn,
    note: schedule.note,
  });
}
