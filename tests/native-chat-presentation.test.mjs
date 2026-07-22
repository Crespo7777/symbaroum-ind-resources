import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const presentationSource = read("scripts/native-chat-presentation.mjs");
const settingsSource = read("scripts/settings.mjs");
const settingsTemplate = read("templates/settings.hbs");
const cssSource = read("styles/symbaroum-ind-resources.css");

const { parseOpposedTest } = await import("../scripts/native-chat-presentation.mjs");

test("updated native attack uses the modifiers already calculated by Symbaroum", () => {
  const defense = parseOpposedTest("Defesa : (16) ⬅ Persuasivo : (-5)");
  assert.deepEqual(defense.attributes, [
    { label: "Defesa", value: 16 },
    { label: "Persuasivo", value: -5 }
  ]);
  assert.equal(defense.objective, 11);

  const attack = parseOpposedTest("Preciso : (12) ⬅ Defesa : (-3) Mod: 1");
  assert.equal(attack.objective, 10);
  assert.equal(attack.modifier, 1);
});

test("system default remains the default and both appearances are explicit", () => {
  assert.match(settingsSource, /register\("nativeChatPresentation", String, "system"/);
  assert.match(settingsTemplate, /value="system"/);
  assert.match(settingsTemplate, /value="updated"/);
});

test("presentation transforms rendered native messages without creating chat messages", () => {
  assert.match(presentationSource, /Hooks\.on\("renderChatMessageHTML"/);
  assert.match(presentationSource, /\.symbaroum\.chat\.combat/);
  assert.match(presentationSource, /source\.hidden = true/);
  assert.doesNotMatch(presentationSource, /ChatMessage(?:\.implementation)?\.create|ChatMessage\.create/);
});

test("switching back restores the native DOM and moved action controls", () => {
  assert.match(presentationSource, /restoreNativeAttacks/);
  assert.match(presentationSource, /parent\.insertBefore\(action\.node, nextSibling\)/);
  assert.match(presentationSource, /source\.hidden = false/);
  assert.match(presentationSource, /settingsChanged/);
});

test("native result blocks and tooltips are preserved instead of recalculated", () => {
  assert.match(presentationSource, /cloneNode\(true\)/);
  assert.match(presentationSource, /siblingsFrom\(model\.rollContainer\)/);
  assert.doesNotMatch(presentationSource, /damageTotal|protectionValue|criticalSuccess/);
});

test("updated attack CSS is namespaced to native combat messages", () => {
  assert.match(cssSource, /\.symbaroum\.chat\.combat\.tenebre-native-combat-updated/);
  assert.match(cssSource, /\.tenebre-native-attack-flow/);
  assert.match(cssSource, /grid-template-columns:\s*minmax\(0, 1fr\) 18px/);
});
