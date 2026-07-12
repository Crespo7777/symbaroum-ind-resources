import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const movementSource = await readFile(new URL("../scripts/movement-ruler.mjs", import.meta.url), "utf8");
const sheetSource = await readFile(new URL("../scripts/sheet-ui.mjs", import.meta.url), "utf8");
const encumbranceSource = await readFile(new URL("../scripts/encumbrance.mjs", import.meta.url), "utf8");

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
