import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { calculateStackBundleSlots } from "../scripts/encumbrance-db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundles = JSON.parse(fs.readFileSync(path.join(root, "data/encumbrance-weights.json"), "utf8")).bundles;

const projectileNames = [
  "Arrows/Bolts - Regular",
  "Flechas/Virotes - Regulares",
  "Flecha - Arpéu",
  "Flecha - Cabeça de Martelo",
  "Flecha - Cauda de Andorinha",
  "Flecha - Cortador de Corda",
  "Flecha - Flamejante",
  "Flecha - Ponta Perfurante de Armadura",
  "Flecha - Precisão",
  "Flecha - Sibilante",
  "Flecha Certeira",
  "Raio Atordoante"
];

test("all official projectile stacks use one slot per ten projectiles", () => {
  for (const name of projectileNames) {
    assert.deepEqual(bundles[name], { bundleSize: 10, slots: 1 }, name);
  }
});

test("projectile stack weight increases only at complete groups of ten", () => {
  const rule = { bundleSize: 10, slots: 1 };
  const cases = new Map([
    [0, 0],
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
    [30, 3],
    [50, 5],
    [60, 6]
  ]);

  for (const [quantity, expected] of cases) {
    assert.equal(calculateStackBundleSlots(quantity, rule), expected, `quantity ${quantity}`);
  }
});
