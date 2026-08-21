import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

function asDate(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}

export function formatRelativeDay(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = asDate(value);
    if (Number.isNaN(d.getTime())) return value;
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return "Demain";
    if (isYesterday(d)) return "Hier";
    const delta = differenceInCalendarDays(new Date(), d);
    if (delta > 0 && delta < 14) return `il y a ${delta} jour${delta > 1 ? "s" : ""}`;
    if (delta < 0 && delta > -14) return `dans ${Math.abs(delta)} jour${Math.abs(delta) > 1 ? "s" : ""}`;
    return format(d, "d MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(asDate(value), "d MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

export function daysOverdue(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = asDate(value);
  if (Number.isNaN(d.getTime())) return null;
  const delta = differenceInCalendarDays(new Date(), d);
  return delta > 0 ? delta : 0;
}
