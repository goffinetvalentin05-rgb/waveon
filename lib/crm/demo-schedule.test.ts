/**
 * Tests de planification de démo (date, rappel, prochaine action).
 * Exécution : npx tsx lib/crm/demo-schedule.test.ts
 */
import assert from "node:assert/strict";
import {
  inferReminderPreset,
  nextActionAfterReminderDone,
  resolveDemoSchedule,
  resolveReminderDate,
  shiftDateOnly,
  validateDemoScheduleInput,
} from "./demo-schedule";

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

test("rappel 2 jours avant le 24 septembre = 22 septembre", () => {
  assert.equal(resolveReminderDate("2026-09-24", "2d"), "2026-09-22");
  assert.equal(shiftDateOnly("2026-09-24", -2), "2026-09-22");
});

test("aucun rappel → null", () => {
  assert.equal(resolveReminderDate("2026-09-24", "none"), null);
});

test("date personnalisée", () => {
  assert.equal(resolveReminderDate("2026-09-24", "custom", "2026-09-20"), "2026-09-20");
});

test("rappel le jour de la démo ou après → invalide", () => {
  const error = validateDemoScheduleInput({
    demoDate: "2026-09-24",
    demoTime: "14:00",
    durationMin: 30,
    reminderPreset: "custom",
    reminderDate: "2026-09-24",
  });
  assert.ok(error);
});

test("cas d’usage : 24.09 14:00 + rappel J-2 → prochaine action = 22.09", () => {
  const schedule = resolveDemoSchedule({
    demoDate: "2026-09-24",
    demoTime: "14:00",
    durationMin: 30,
    reminderPreset: "2d",
  });
  assert.equal(schedule.reminderOn, "2026-09-22");
  assert.equal(schedule.nextFollowUp, "2026-09-22");
  assert.equal(schedule.nextAction, "Envoyer le rappel de démo");
  assert.equal(schedule.demoTime, "14:00");
  assert.equal(schedule.durationMin, 30);
});

test("sans rappel → prochaine action = date de démo", () => {
  const schedule = resolveDemoSchedule({
    demoDate: "2026-09-24",
    demoTime: "14:00",
    durationMin: 30,
    reminderPreset: "none",
  });
  assert.equal(schedule.reminderOn, null);
  assert.equal(schedule.nextFollowUp, "2026-09-24");
  assert.equal(schedule.nextAction, "Démo planifiée · 14:00");
});

test("après rappel effectué → prochaine action = démo", () => {
  const schedule = resolveDemoSchedule({
    demoDate: "2026-09-24",
    demoTime: "14:00",
    durationMin: 30,
    reminderPreset: "2d",
  });
  const next = nextActionAfterReminderDone(schedule.demoAt);
  assert.equal(next.nextFollowUp, "2026-09-24");
  assert.equal(next.nextAction, "Démo planifiée · 14:00");
});

test("infère le preset J-2", () => {
  assert.equal(inferReminderPreset("2026-09-24", "2026-09-22"), "2d");
  assert.equal(inferReminderPreset("2026-09-24", null), "none");
  assert.equal(inferReminderPreset("2026-09-24", "2026-09-20"), "custom");
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
