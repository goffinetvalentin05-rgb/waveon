import { calendarFeedCalendarName } from "@/lib/calendar/feed";

const CRLF = "\r\n";
const DEFAULT_TZ = "Europe/Zurich";

export type IcsEventInput = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  updatedAt?: string | null;
  createdAt?: string | null;
  url?: string | null;
};

export function calendarEventUid(eventId: string): string {
  return `calendar-event-${eventId}@waveone.com`;
}

export function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("Date ICS invalide");
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function toIcsDateInTimeZone(iso: string, timeZone = DEFAULT_TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("Date ICS invalide");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}${pick("month")}${pick("day")}`;
}

export function addIcsDateDays(yyyymmdd: string, days: number): string {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function icsEscapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let offset = 0;
  let limit = 75;
  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length);
    while (end > offset && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
    if (end === offset) end = Math.min(offset + limit, bytes.length);
    chunks.push(decoder.decode(bytes.slice(offset, end)));
    offset = end;
    limit = 74;
  }
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join(CRLF);
}

function line(name: string, value: string): string {
  return foldIcsLine(`${name}:${icsEscapeText(value)}`);
}

function rawLine(name: string, value: string): string {
  return foldIcsLine(`${name}:${value}`);
}

export function eventDescriptionForIcs(input: {
  description?: string | null;
  projectName: string;
}): string {
  const existing = (input.description ?? "").trim();
  const projectLine = `Projet : ${input.projectName}`;
  if (!existing) return projectLine;
  if (existing.includes(projectLine) || /(^|\n)Projet\s*:/i.test(existing)) return existing;
  return `${existing}\n${projectLine}`;
}

export function buildProjectIcs(input: {
  projectName: string;
  events: IcsEventInput[];
  now?: Date;
}): string {
  const calendarName = calendarFeedCalendarName(input.projectName);
  const stamp = toIcsUtc((input.now ?? new Date()).toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waveone//Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    line("X-WR-CALNAME", calendarName),
    line("X-WR-CALDESC", `Calendrier du projet ${input.projectName} dans Waveone`),
  ];

  for (const event of input.events) {
    const uid = calendarEventUid(event.id);
    const modified = toIcsUtc(event.updatedAt || event.createdAt || event.startAt);
    lines.push("BEGIN:VEVENT");
    lines.push(rawLine("UID", uid));
    lines.push(rawLine("DTSTAMP", stamp));
    lines.push(rawLine("LAST-MODIFIED", modified));
    if (event.allDay) {
      const start = toIcsDateInTimeZone(event.startAt);
      const endExclusive = addIcsDateDays(toIcsDateInTimeZone(event.endAt), 1);
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      lines.push(`DTEND;VALUE=DATE:${endExclusive === start ? addIcsDateDays(start, 1) : endExclusive}`);
    } else {
      lines.push(rawLine("DTSTART", toIcsUtc(event.startAt)));
      lines.push(rawLine("DTEND", toIcsUtc(event.endAt)));
    }
    lines.push(line("SUMMARY", event.title));
    const description = eventDescriptionForIcs({
      description: event.description,
      projectName: input.projectName,
    });
    if (description) lines.push(line("DESCRIPTION", description));
    if (event.location?.trim()) lines.push(line("LOCATION", event.location.trim()));
    if (event.url) lines.push(rawLine("URL", event.url));
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join(CRLF)}${CRLF}`;
}
