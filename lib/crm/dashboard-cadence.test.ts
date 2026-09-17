/**
 * Cadence : ne compter que les vraies prises de contact.
 * Exécution : npx tsx lib/crm/dashboard-cadence.test.ts
 */
import assert from "node:assert/strict";
import { buildActivitySeries, cadenceBucketForAction } from "./dashboard";

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

test("imports et créations ne comptent pas", () => {
  assert.equal(cadenceBucketForAction("imported"), null);
  assert.equal(cadenceBucketForAction("created"), null);
  assert.equal(cadenceBucketForAction("status_change"), null);
  assert.equal(cadenceBucketForAction("note"), null);
});

test("emails, appels, messages et rendez-vous comptent", () => {
  assert.equal(cadenceBucketForAction("email"), "emails");
  assert.equal(cadenceBucketForAction("call"), "calls");
  assert.equal(cadenceBucketForAction("message"), "messages");
  assert.equal(cadenceBucketForAction("meeting"), "meetings");
  assert.equal(cadenceBucketForAction("demo_scheduled"), "meetings");
});

test("une série ignore 74 imports et ne garde que les contacts", () => {
  const today = new Date().toISOString().slice(0, 10);
  const series = buildActivitySeries(7, [
    { action_type: "imported", created_at: `${today}T10:00:00.000Z` },
    { action_type: "imported", created_at: `${today}T10:01:00.000Z` },
    { action_type: "email", created_at: `${today}T11:00:00.000Z` },
    { action_type: "call", created_at: `${today}T12:00:00.000Z` },
  ]);
  const day = series.find((p) => p.date === today);
  assert.ok(day);
  assert.equal(day.emails, 1);
  assert.equal(day.calls, 1);
  assert.equal(day.messages, 0);
  assert.equal(day.meetings, 0);
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
