/** Génère un fichier iCalendar (.ics) minimal pour un rendez-vous Waevon. */

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatIcsUtc(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    out.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return out.join("\r\n");
}

export type ReservationIcsInput = {
  reservationId: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
};

export function buildReservationIcsString(input: ReservationIcsInput): string {
  const uid = `${input.reservationId}@waevon-booking`;
  const dtStamp = formatIcsUtc(new Date());
  const dtStart = formatIcsUtc(input.start);
  const dtEnd = formatIcsUtc(input.end);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waevon//Réservation//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldIcsLine(`SUMMARY:${escapeIcsText(input.title)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(input.description)}`),
    foldIcsLine(`LOCATION:${escapeIcsText(input.location)}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function sanitizeIcsFilenameSegment(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "rendez-vous";
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
