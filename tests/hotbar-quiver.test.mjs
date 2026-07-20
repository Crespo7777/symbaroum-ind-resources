import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "scripts/hotbar.mjs"), "utf8");

test("quiver HUD requires a ranged weapon and a real active quiver", () => {
  assert.match(source, /getWeaponAmmoType/);
  assert.match(source, /const hasRangedWeapon = actorItems\(actor\)\.some/);
  assert.match(source, /const visible = hasRangedWeapon && quivers\.length > 0/);
  assert.match(source, /isQuiver\(item\)/);
  assert.doesNotMatch(source, /fa-box-archive/);
});
