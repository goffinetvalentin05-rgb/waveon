/** Date calendaire locale `YYYY-MM-DD` (évite le décalage UTC de toISOString). */
export function dateOnly(value: Date | string): string {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    return dateOnly(d);
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function crmToday(now = new Date()): string {
  return dateOnly(now);
}

export function parseDateOnly(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}
