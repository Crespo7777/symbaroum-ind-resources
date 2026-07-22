import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeBatch,
  isAllowedCombatantUpdate,
  isAllowedToughnessUpdate,
  isModuleManeuverEffect,
  sanitizeSocketOptions
} from "../scripts/socket-policy.mjs";

test("socket policy only accepts namespaced maneuver effects", () => {
  const valid = {
    flags: {
      "symbaroum-ind-resources": {
        maneuverEffect: true,
        effectId: "tenebre-maneuver-grappled"
      }
    }
  };
  assert.equal(isModuleManeuverEffect(valid, "symbaroum-ind-resources"), true);
  assert.equal(isModuleManeuverEffect({ flags: { core: { statusId: "dead" } } }, "symbaroum-ind-resources"), false);
});

test("socket policy limits non-owner actor updates to toughness reduction", () => {
  assert.equal(isAllowedToughnessUpdate({ "system.health.toughness.value": 7 }, 10), true);
  assert.equal(isAllowedToughnessUpdate({ "system.health.toughness.value": 11 }, 10), false);
  assert.equal(isAllowedToughnessUpdate({ "system.health.toughness.value": 7, name: "Changed" }, 10), false);
});

test("socket policy only accepts supported combatant fields", () => {
  assert.equal(isAllowedCombatantUpdate({ initiative: 14 }), true);
  assert.equal(isAllowedCombatantUpdate({ defeated: true }), true);
  assert.equal(isAllowedCombatantUpdate({ defeated: false }), false);
  assert.equal(isAllowedCombatantUpdate({ name: "Changed" }), false);
});

test("socket policy limits batches and normalizes operation options", () => {
  assert.doesNotThrow(() => assertSafeBatch(["one"], "test"));
  assert.throws(() => assertSafeBatch([], "test"));
  assert.throws(() => assertSafeBatch(Array.from({ length: 51 }, (_, index) => index), "test"));
  assert.deepEqual(sanitizeSocketOptions({ render: false, diff: false }), { render: false });
});
