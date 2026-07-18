import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maneuvers = fs.readFileSync(path.join(root, "scripts/maneuvers.mjs"), "utf8");
const modernChat = fs.readFileSync(path.join(root, "scripts/modern-chat.mjs"), "utf8");

test("maneuver cards are created after dice and finalized afterward", () => {
  assert.match(maneuvers, /async function createManeuverMessageAfterDice\(/);
  assert.match(maneuvers, /const message = await createChatMessageAfterDice\(\{ speaker, content, rolls, flags \}\);[\s\S]*await yieldToManeuverChat\(\);[\s\S]*const finalContent = await finalize\(\);/);
  assert.match(maneuvers, /finalize: async \(\) => buildContent\(await applyOpposedManeuverEffects\(/);
  assert.match(maneuvers, /finalize: async \(\) => \{[\s\S]*applyAttackManeuverEffects\(/);
  assert.match(maneuvers, /finalize: async \(\) => buildContent\(await applyKnockdownManeuverEffects\(/);
  assert.match(maneuvers, /finalize: async \(\) => buildContent\(await applyAttributeManeuverEffects\(/);
  assert.match(maneuvers, /finalize: async \(\) => buildContent\(await applyDamageCheckEffects\(/);
});

test("maneuver cards expose their opposed-test formula and GM log name", () => {
  assert.match(modernChat, /test: normalizeManeuverTest\(test\)/);
  assert.match(modernChat, /function normalizeManeuverTest\(value\)/);
  assert.match(maneuvers, /subjectName: localize\(maneuver\?\.labelKey\)/);
  assert.doesNotMatch(maneuvers, /subjectName: localize\(maneuver\?\.nameKey\)/);
});

test("targeted maneuver cards use the horizontal actor-maneuver-target sequence", () => {
  assert.match(modernChat, /const isTargetedSequence = \(isAttack \|\| isManeuver\) && Boolean\(targetName \|\| targetImg\)/);
  assert.match(modernChat, /isManeuver \? "tenebre-modern-chat-illustrated-maneuver"/);
  assert.match(modernChat, /isTargetedSequence && \(targetName \|\| targetImg\)/);
  assert.match(modernChat, /!isTargetedSequence \? `<div class="tenebre-illustrated-action">/);
});
