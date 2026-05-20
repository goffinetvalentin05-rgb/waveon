import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeTacleSteal } from "@/lib/pronoclash/card-effects";
import {
  isPredictionLocked,
  predictionLockTime,
  VAR_LOCK_MINUTES_BEFORE_KICKOFF,
} from "@/lib/pronoclash/prediction-lock";
import { V1_STARTER_PACK } from "@/lib/pronoclash/card-messages";

describe("V1 starter pack", () => {
  it("contient exactement 5 cartes à quantité 1", () => {
    const entries = Object.entries(V1_STARTER_PACK);
    assert.equal(entries.length, 5);
    for (const [, qty] of entries) {
      assert.equal(qty, 1);
    }
  });
});

describe("computeTacleSteal", () => {
  it("ne vole rien si l'auteur n'a pas plus de points", () => {
    assert.deepEqual(computeTacleSteal(3, 5), {
      stolen: 0,
      authorDelta: 0,
      targetDelta: 0,
    });
  });

  it("vole 2 pts si la cible en a assez sur le match", () => {
    assert.deepEqual(computeTacleSteal(8, 4), {
      stolen: 2,
      authorDelta: 2,
      targetDelta: -2,
    });
  });

  it("ne descend pas la cible sous 0 sur le match", () => {
    assert.deepEqual(computeTacleSteal(5, 1), {
      stolen: 1,
      authorDelta: 1,
      targetDelta: -1,
    });
  });
});

describe("VAR lock", () => {
  const kickoff = "2030-06-01T18:00:00.000Z";

  it("verrouille au kickoff sans VAR", () => {
    const atKickoff = new Date("2030-06-01T18:00:00.000Z");
    assert.equal(isPredictionLocked(null, kickoff, atKickoff), true);
  });

  it("permet d'éditer jusqu'à 10 min avant le coup d'envoi avec VAR", () => {
    const elevenMinBefore = new Date(
      new Date(kickoff).getTime() - (VAR_LOCK_MINUTES_BEFORE_KICKOFF + 1) * 60_000
    );
    assert.equal(
      isPredictionLocked(null, kickoff, elevenMinBefore, { varActive: true }),
      false
    );
    const atVarLock = predictionLockTime(null, kickoff, { varActive: true });
    assert.ok(atVarLock);
    assert.equal(
      isPredictionLocked(null, kickoff, atVarLock!, { varActive: true }),
      true
    );
  });
});
