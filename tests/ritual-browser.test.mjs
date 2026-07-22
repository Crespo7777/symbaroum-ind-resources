import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "rituals.json"), "utf8"));
const sheetUiSource = fs.readFileSync(path.join(root, "scripts", "sheet-ui.mjs"), "utf8");

let ritualCatalogEnabled = true;
globalThis.game = {
  i18n: { lang: "pt-BR" },
  settings: {
    get(_moduleId, key) {
      if (key === "enableRitualCatalog") return ritualCatalogEnabled;
      return undefined;
    }
  }
};

const {
  RitualBrowserService,
  isRestrictedTradition,
  isRitualDocument,
  isRitualistAbility,
  mergeRitualSources
} = await import("../scripts/ritual-browser.mjs");

assert.equal(RitualBrowserService.isEnabled(), true);
ritualCatalogEnabled = false;
assert.equal(RitualBrowserService.isEnabled(), false, "catalog setting must be read without a stale cache");
assert.equal(await RitualBrowserService.open(null), null, "disabled catalog must not build or render a dialog");
ritualCatalogEnabled = true;

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

assert.match(
  sheetUiSource,
  /const ritualistRow = findAbilityItemRow[\s\S]*?moveAbilityRowToEnd\(ritualistRow\);[\s\S]*?enableRitualistGrouping/,
  "Ritualist must be moved to the end before grouped rituals are rendered"
);
assert.match(
  sheetUiSource,
  /tenebre-ritualist-inline-row-right[\s\S]*?isAbilityRowInRightColumn\(ritualistRow\)/,
  "grouped rituals must follow Ritualist's rendered column"
);
assert.match(
  sheetUiSource,
  /const ritualistRow = findAbilityItemRow[\s\S]*?if \(!ritualistRow\) \{[\s\S]*?scheduleRitualistInjectionRetry[\s\S]*?return;[\s\S]*?querySelectorAll\("\.tenebre-ritualist-inline-row"\)/,
  "a transiently missing Ritualist row must not remove the existing inline list"
);
assert.match(
  sheetUiSource,
  /const renderExpandedState = \(\) => \{[\s\S]*?const rituals = getRituals\(\);[\s\S]*?buildRitualistInlineRow/,
  "each expansion must rebuild from the actor's current ritual collection"
);
assert.match(
  sheetUiSource,
  /function refreshOpenRitualistLists[\s\S]*?injectRitualistInlineList\(app, root, actor\)/,
  "ritual creation and deletion must reconcile every open sheet"
);
assert.match(
  sheetUiSource,
  /function scheduleRitualistInjectionRetry[\s\S]*?attempts >= 3[\s\S]*?currentRoot = getRoot\(app\?\.element\) \?\? root/,
  "Ritualist injection retries must be bounded and follow a replaced sheet root"
);

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
