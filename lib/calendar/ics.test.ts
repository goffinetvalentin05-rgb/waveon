/**
 * Tests du flux iCalendar projet (UID, UTC, DST, isolation).
 * Exécution : npx tsx lib/calendar/ics.test.ts
 */
import assert from "node:assert/strict";
import {
  calendarFeedCalendarName,
  calendarFeedHttpsUrl,
  calendarFeedWebcalUrl,
  generateCalendarFeedToken,
  parseCalendarFeedToken,
  prospectEventUrl,
} from "./feed";
import {
  addIcsDateDays,
  buildProjectIcs,
  calendarEventUid,
  eventDescriptionForIcs,
  icsEscapeText,
  toIcsDateInTimeZone,
  toIcsUtc,
} from "./ics";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`KO  ${name}`);
    console.error(error);
  }
}

test("UID stable basé sur l’id d’événement", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  assert.equal(calendarEventUid(id), "calendar-event-11111111-2222-3333-4444-555555555555@waveone.com");
});

test("heure d’été : 14:00 Zurich = 12:00 UTC", () => {
  assert.equal(toIcsUtc("2026-09-24T12:00:00.000Z"), "20260924T120000Z");
});

test("heure d’hiver : 14:00 Zurich = 13:00 UTC", () => {
  assert.equal(toIcsUtc("2026-12-24T13:00:00.000Z"), "20261224T130000Z");
});

test("journée entière en Europe/Zurich", () => {
  assert.equal(toIcsDateInTimeZone("2026-09-23T22:00:00.000Z"), "20260924");
  assert.equal(addIcsDateDays("20260924", 1), "20260925");
});

test("échappement ICS", () => {
  assert.equal(icsEscapeText("A;B,C\\D\nE"), "A\\;B\\,C\\\\D\\nE");
});

test("token : 64 hex, .ics optionnel, rejet des valeurs courtes", () => {
  const token = generateCalendarFeedToken();
  assert.equal(token.length, 64);
  assert.equal(parseCalendarFeedToken(`${token}.ics`), token);
  assert.equal(parseCalendarFeedToken("abc"), null);
  assert.equal(parseCalendarFeedToken("project-id-uuid"), null);
});

test("URL https et webcal", () => {
  const token = "a".repeat(64);
  const httpsUrl = calendarFeedHttpsUrl(token, "https://waveone.com");
  assert.equal(httpsUrl, `https://waveone.com/api/calendar/feed/${token}.ics`);
  assert.equal(calendarFeedWebcalUrl(httpsUrl), `webcal://waveone.com/api/calendar/feed/${token}.ics`);
});

test("feed : même UID après changement de date, pas de doublon", () => {
  const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const first = buildProjectIcs({
    projectName: "Obillz",
    now: new Date("2026-09-15T10:00:00.000Z"),
    events: [
      {
        id,
        title: "Démo — FC Luc-Dorigny",
        startAt: "2026-09-24T12:00:00.000Z",
        endAt: "2026-09-24T12:30:00.000Z",
        description: "Prospect : FC Luc-Dorigny\nContact : David Brandt",
        url: "https://waveone.com/projects/obillz/prospects/p1",
      },
    ],
  });
  const second = buildProjectIcs({
    projectName: "Obillz",
    now: new Date("2026-09-15T10:00:00.000Z"),
    events: [
      {
        id,
        title: "Démo — FC Luc-Dorigny",
        startAt: "2026-09-25T14:00:00.000Z",
        endAt: "2026-09-25T14:30:00.000Z",
      },
    ],
  });

  assert.match(first, /^BEGIN:VCALENDAR/);
  assert.match(first, /X-WR-CALNAME:Obillz — Waveone/);
  assert.match(first, /UID:calendar-event-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@waveone.com/);
  assert.match(first, /DTSTART:20260924T120000Z/);
  assert.match(first, /DTEND:20260924T123000Z/);
  assert.match(first, /SUMMARY:Démo — FC Luc-Dorigny/);
  assert.match(second, /DTSTART:20260925T140000Z/);
  assert.equal(
    first.match(/UID:[^\r\n]+/)?.[0],
    second.match(/UID:[^\r\n]+/)?.[0]
  );
  assert.equal((second.match(/BEGIN:VEVENT/g) ?? []).length, 1);
});

test("événement supprimé : absent du snapshot", () => {
  const ics = buildProjectIcs({
    projectName: "Obillz",
    events: [],
  });
  assert.doesNotMatch(ics, /BEGIN:VEVENT/);
  assert.match(ics, /END:VCALENDAR/);
});

test("projets isolés par construction du fichier", () => {
  const obillz = buildProjectIcs({
    projectName: "Obillz",
    events: [{ id: "1", title: "Démo — Obillz", startAt: "2026-09-24T12:00:00.000Z", endAt: "2026-09-24T12:30:00.000Z" }],
  });
  const ikonera = buildProjectIcs({
    projectName: "Ikonera",
    events: [{ id: "2", title: "Kickoff Ikonera", startAt: "2026-09-24T12:00:00.000Z", endAt: "2026-09-24T13:00:00.000Z" }],
  });
  assert.match(obillz, /X-WR-CALNAME:Obillz — Waveone/);
  assert.doesNotMatch(obillz, /Ikonera/);
  assert.match(ikonera, /Kickoff Ikonera/);
  assert.doesNotMatch(ikonera, /Obillz/);
});

test("description enrichie du projet + URL prospect", () => {
  assert.equal(
    eventDescriptionForIcs({ description: "Prospect : FC Luc-Dorigny", projectName: "Obillz" }),
    "Prospect : FC Luc-Dorigny\nProjet : Obillz"
  );
  assert.equal(
    prospectEventUrl({
      baseUrl: "https://waveone.com",
      projectId: "proj-1",
      source: "crm",
      sourceId: "prospect-1",
    }),
    "https://waveone.com/projects/proj-1/prospects/prospect-1"
  );
  assert.equal(
    prospectEventUrl({ projectId: "proj-1", source: "manual", sourceId: "x" }),
    null
  );
  assert.equal(calendarFeedCalendarName("Obillz"), "Obillz — Waveone");
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
