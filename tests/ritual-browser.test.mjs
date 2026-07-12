import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "rituals.json"), "utf8"));

globalThis.game = {
  i18n: { lang: "pt-BR" }
};

const {
  isRestrictedTradition,
  isRitualDocument,
  isRitualistAbility,
  mergeRitualSources
} = await import("../scripts/ritual-browser.mjs");

assert.equal(catalog.version, 1);
assert.equal(catalog.rituals.length, 66, "the official ritual catalog must contain all 66 rituals");
assert.equal(new Set(catalog.rituals.map((entry) => entry.nameEn)).size, 66, "English ritual names must be unique");
assert.equal(new Set(catalog.rituals.map((entry) => entry.namePt)).size, 66, "Portuguese ritual names must be unique");
assert.equal(catalog.rituals.every((entry) => entry.nameEn && entry.namePt && entry.traditionEn && entry.traditionPt), true);

assert.equal(isRitualistAbility({ type: "ability", name: "Ritualista" }), true);
assert.equal(isRitualistAbility({ type: "ability", name: "Ritualist" }), true);
assert.equal(isRitualistAbility({ type: "ability", name: "Ritualista (Familiar)" }), false);
assert.equal(isRitualistAbility({ type: "ritual", name: "Ritualista" }), false);

assert.equal(isRitualDocument({ type: "ritual" }), true);
assert.equal(isRitualDocument({ type: "ability", system: { isRitual: true } }), true);
assert.equal(isRestrictedTradition("Disponível apenas para Confessores"), true);
assert.equal(isRestrictedTradition("Confessors only"), true);
assert.equal(isRestrictedTradition("Teurgia"), false);

const merged = mergeRitualSources(
  catalog.rituals,
  [{ name: "Expiação", img: "atonement.webp", document: { sheet: {} }, sourceData: { name: "Expiação" } }],
  { items: [{ type: "ritual", name: "Expiação" }] }
);
const atonement = merged.find((entry) => entry.namePt === "Expiação");
assert.equal(atonement.img, "atonement.webp");
assert.deepEqual(atonement.document, { sheet: {} });
assert.deepEqual(atonement.sourceData, { name: "Expiação" });
assert.equal(atonement.owned, true);
assert.equal(atonement.restricted, true);

console.log("ritual browser tests passed (66 official rituals)");
