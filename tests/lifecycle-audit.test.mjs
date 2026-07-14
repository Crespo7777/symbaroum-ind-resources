import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const movementSource = await readFile(new URL("../scripts/movement-ruler.mjs", import.meta.url), "utf8");
const sheetSource = await readFile(new URL("../scripts/sheet-ui.mjs", import.meta.url), "utf8");
const encumbranceSource = await readFile(new URL("../scripts/encumbrance.mjs", import.meta.url), "utf8");
const modernChatSource = await readFile(new URL("../scripts/modern-chat.mjs", import.meta.url), "utf8");
const ammoSource = await readFile(new URL("../scripts/ammo.mjs", import.meta.url), "utf8");

test("movement validation uses the public synchronous preMoveToken hook", () => {
  assert.match(movementSource, /Hooks\.on\("preMoveToken"/);
  assert.doesNotMatch(movementSource, /_preUpdateMovement/);
  assert.doesNotMatch(movementSource, /Hooks\.on\("preMoveToken",\s*async/);
});

test("sheet UI does not register redundant V1 inheritance render hooks", () => {
  assert.doesNotMatch(sheetSource, /ACTOR_SHEET_HOOKS|ITEM_SHEET_HOOKS/);
  assert.doesNotMatch(sheetSource, /Hooks\.on\("renderApplication"/);
  assert.match(sheetSource, /Hooks\.on\("renderApplicationV2"/);
});

test("encumbrance weight watcher is stoppable and overlap guarded", () => {
  assert.match(encumbranceSource, /dynamicWeightFileWatcherBusy/);
  assert.match(encumbranceSource, /stopDynamicWeightFileWatcher/);
  assert.match(encumbranceSource, /clearInterval\(dynamicWeightFileWatcher\)/);
});

test("apply-results chat message uses the text-only illustrated card", () => {
  const source = modernChatSource.match(/function buildApplyResultsCard[\s\S]*?\n}\n\nfunction buildSystemMacroCard/)?.[0] ?? "";
  assert.match(source, /simpleIllustratedTextCard/);
  assert.match(source, /tenebre-modern-chat-apply-results/);
  assert.doesNotMatch(source, /cardShell/);
});

test("ammunition provenance uses compendiumSource instead of deprecated core.sourceId APIs", () => {
  const sources = [sheetSource, ammoSource, modernChatSource].join("\n");
  assert.doesNotMatch(sources, /getFlag\?\.\("core", "sourceId"\)/);
  assert.doesNotMatch(sources, /flags\.core\s*=\s*\{\s*sourceId:/);
  assert.match(ammoSource, /_stats\s*=\s*\{\s*compendiumSource:/);
});
