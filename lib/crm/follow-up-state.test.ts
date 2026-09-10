/**
 * Tests de la logique de suivi prospects (relances + interactions).
 * Exécution : npx tsx lib/crm/follow-up-state.test.ts
 */
import assert from "node:assert/strict";
import { getFollowUpState } from "./follow-up-state";
import { applyInteraction, nextStageAfterInteraction } from "./interactions";
import { resolveQuickActionAt } from "./actions";

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

const TODAY = "2026-09-10";
const YESTERDAY = "2026-09-09";
const IN_7_DAYS = "2026-09-17";

test("CAS 1 — relance prévue hier, aucune interaction → En retard de 1 jour", () => {
  const state = getFollowUpState(
    { status: "Relance 2", next_follow_up: YESTERDAY },
    TODAY
  );
  assert.equal(state.kind, "overdue");
  assert.equal(state.days, 1);
  assert.equal(state.alert, "En retard de 1 jour");
});

test("CAS 2 — relance prévue aujourd'hui → À relancer aujourd'hui", () => {
  const state = getFollowUpState(
    { status: "Relance 1", next_follow_up: TODAY },
    TODAY
  );
  assert.equal(state.kind, "today");
  assert.equal(state.alert, "À relancer aujourd'hui");
});

test("CAS 3 — relance hier + email aujourd'hui → plus aucun En retard", () => {
  const after = applyInteraction({
    currentStatus: "Relance 2",
    nextFollowUp: YESTERDAY,
    channel: "email",
    kind: "follow_up_2",
    occurredOn: TODAY,
  });
  assert.equal(after.nextFollowUp, null);
  const state = getFollowUpState(
    { status: after.status, next_follow_up: after.nextFollowUp },
    TODAY
  );
  assert.equal(state.kind, "none");
  assert.equal(state.alert, null);
});

test("CAS 4 — Relance 1 aujourd'hui + prochaine relance dans 7 jours", () => {
  const after = applyInteraction({
    currentStatus: "Relance 1",
    nextFollowUp: YESTERDAY,
    channel: "email",
    kind: "follow_up_1",
    occurredOn: TODAY,
    nextFollowUpAfter: IN_7_DAYS,
  });
  assert.equal(after.status, "Relance 2");
  assert.equal(after.lastAction, "Relance 1 envoyée");
  assert.equal(after.nextFollowUp, IN_7_DAYS);
  assert.ok(after.lastActionAt.startsWith(TODAY));

  const followUp = getFollowUpState(
    { status: after.status, next_follow_up: after.nextFollowUp },
    TODAY
  );
  assert.equal(followUp.kind, "future");
  assert.equal(followUp.days, 7);
});

test("CAS 5 — aucune prochaine relance → aucune alerte", () => {
  const state = getFollowUpState({ status: "Relance 1", next_follow_up: null }, TODAY);
  assert.equal(state.kind, "none");
  assert.equal(state.alert, null);
});

test("CAS 6 — client → jamais à relancer même avec une date", () => {
  const state = getFollowUpState(
    { status: "Client", next_follow_up: YESTERDAY },
    TODAY
  );
  assert.equal(state.kind, "none");
  assert.equal(state.alert, null);
});

test("CAS 7 — fermé → aucune ancienne échéance n'alerte", () => {
  const state = getFollowUpState(
    { status: "Fermé", next_follow_up: YESTERDAY },
    TODAY
  );
  assert.equal(state.kind, "none");
  assert.equal(state.alert, null);
});

test("CAS 8 — suppression : le dernier contact se recalcule, l'échéance n'est pas réinventée", () => {
  const remainingLastContact = "2026-09-02";
  const remaining = applyInteraction({
    currentStatus: "À contacter",
    nextFollowUp: null,
    channel: "email",
    kind: "first_contact",
    occurredOn: remainingLastContact,
    nextFollowUpAfter: "2026-09-08",
  });
  assert.equal(remaining.status, "Relance 1");
  assert.equal(remaining.lastAction, "Premier contact envoyé");
  assert.ok(remaining.lastActionAt.startsWith(remainingLastContact));

  const afterDeletedLaterInteraction = getFollowUpState(
    { status: remaining.status, next_follow_up: remaining.nextFollowUp },
    TODAY
  );
  assert.equal(afterDeletedLaterInteraction.kind, "overdue");
  assert.equal(afterDeletedLaterInteraction.days, 2);
});

test("jamais Contacté aujourd'hui + En retard ensemble après un contact du jour", () => {
  const after = applyInteraction({
    currentStatus: "Relance 2",
    nextFollowUp: "2026-09-08",
    channel: "email",
    kind: "follow_up_2",
    occurredOn: TODAY,
  });
  const followUp = getFollowUpState(
    { status: after.status, next_follow_up: after.nextFollowUp },
    TODAY
  );
  assert.equal(after.lastActionAt.startsWith(TODAY), true);
  assert.notEqual(followUp.kind, "overdue");
});

test("étape : Premier contact → Relance 1, Relance 1 → Relance 2, sans reculer", () => {
  assert.equal(nextStageAfterInteraction("À contacter", "first_contact"), "Relance 1");
  assert.equal(nextStageAfterInteraction("Relance 1", "follow_up_1"), "Relance 2");
  assert.equal(nextStageAfterInteraction("Relance 2", "follow_up_2"), "Relance 2");
  assert.equal(nextStageAfterInteraction("En discussion", "follow_up_1"), "En discussion");
  assert.equal(nextStageAfterInteraction("Relais", "first_contact"), "Relais");
  assert.equal(nextStageAfterInteraction("Décision en attente", "follow_up_1"), "Décision en attente");
  assert.equal(nextStageAfterInteraction("Client", "first_contact"), "Client");
});

const SETTINGS = {
  delay_relance_1_days: 7,
  delay_relance_2_days: 7,
  delay_relance_3_days: 7,
};

test("CAS — Démo planifiée + Démo effectuée → Décision en attente", () => {
  const result = resolveQuickActionAt(
    "demo_done",
    "Démo",
    SETTINGS,
    "FC Exemple",
    new Date(`${TODAY}T12:00:00.000Z`)
  );
  assert.equal(result.status, "Décision en attente");
  assert.equal(result.lastAction, "Démo effectuée");
  assert.equal(result.activityTitle, "Démo effectuée");
  assert.equal(result.nextFollowUp, null);

  const fromDiscussion = resolveQuickActionAt(
    "demo_done",
    "En discussion",
    SETTINGS,
    "FC Exemple",
    new Date(`${TODAY}T12:00:00.000Z`)
  );
  assert.equal(fromDiscussion.status, "Décision en attente");
});

test("CAS — Décision en attente + relance dans 5 jours → pas d'alerte de retard", () => {
  const state = getFollowUpState(
    { status: "Décision en attente", next_follow_up: "2026-09-15" },
    TODAY
  );
  assert.equal(state.kind, "future");
  assert.equal(state.days, 5);
  assert.notEqual(state.kind, "overdue");
  assert.notEqual(state.kind, "today");
});

test("CAS — Décision en attente + relance aujourd'hui → À relancer aujourd'hui", () => {
  const state = getFollowUpState(
    { status: "Décision en attente", next_follow_up: TODAY },
    TODAY
  );
  assert.equal(state.kind, "today");
  assert.equal(state.alert, "À relancer aujourd'hui");
});

test("CAS — Décision en attente accepté → Client, refusé → Fermé", () => {
  const won = resolveQuickActionAt("client", "Décision en attente", SETTINGS, "FC Exemple", new Date());
  assert.equal(won.status, "Client");
  const lost = resolveQuickActionAt("refus", "Décision en attente", SETTINGS, "FC Exemple", new Date());
  assert.equal(lost.status, "Fermé");
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
