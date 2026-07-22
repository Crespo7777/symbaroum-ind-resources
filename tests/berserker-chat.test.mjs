import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const source = read("scripts/berserker-chat.mjs");
const init = read("scripts/init.mjs");
const css = read("styles/symbaroum-ind-resources.css");

const { isBerserkerItem } = await import("../scripts/berserker-chat.mjs");

test("only the native Berserker ability is eligible for the Amoque card", () => {
  assert.equal(isBerserkerItem({ system: { reference: "berserker" } }), true);
  assert.equal(isBerserkerItem({ system: { reference: "dominate" } }), false);
  assert.equal(isBerserkerItem(null), false);
  assert.match(source, /\.symbaroum\.chat\.ability/);
  assert.match(source, /displayedName\.startsWith\(normalize\(item\.name\)\)/);
});

test("Amoque card centers actor and ability portraits with captions underneath", () => {
  assert.match(source, /card\.append\(createPortrait\(actorImage, actorName, "tenebre-berserker-actor"\)\)/);
  assert.match(source, /card\.append\(createAbilityFigure\(abilityImage, abilityCaption \|\| item\.name, item\)\)/);
  assert.match(source, /figure\.append\(image, caption\)/);
  assert.match(css, /\.tenebre-berserker-actor,[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*center;/);
});

test("the displayed ability name opens the owned ability sheet", () => {
  assert.match(source, /className = "content-link tenebre-berserker-ability-link"/);
  assert.match(source, /link\.dataset\.uuid = item\.uuid/);
  assert.match(source, /item\.sheet\?\.render\?\.\(\{ force: true \}\)/);
});

test("Amoque presentation follows the shared Original or Ind Resources setting", () => {
  assert.match(source, /enableCompactNpcAttackChat/);
  assert.match(source, /source\.hidden = true/);
  assert.match(source, /source\.hidden = false/);
  assert.match(init, /import \{ BerserkerChatService \} from "\.\/berserker-chat\.mjs"/);
  assert.match(init, /BerserkerChatService\.register\(\)/);
  assert.match(css, /\.symbaroum\.chat\.ability\.tenebre-berserker-compact/);
});
