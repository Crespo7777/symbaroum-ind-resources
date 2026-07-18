import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWeaponReadinessChatContent,
  buildWeaponReadinessPatches,
  canAttackWithWeapon,
  getWeaponHandCost,
  getWeaponHandUsage,
  isDrawn,
  isEligibleWeapon,
  resolveWeaponItem,
  WEAPON_READINESS_ICON,
  WEAPON_READINESS_FLAG,
  WEAPON_SHEATHED_STATE
} from "../scripts/weapon-readiness.mjs";
import {
  isWeaponReadinessIndicatorEffect,
  WEAPON_READINESS_INDICATOR_FLAG
} from "../scripts/weapon-readiness-visuals.mjs";
import { buildVisualActiveEffectData } from "../scripts/compatibility.mjs";

const scope = "symbaroum-ind-resources";
globalThis.game = { symbaroum: {} };

function requireModernChatSource() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return fs.readFileSync(path.join(root, "scripts", "modern-chat.mjs"), "utf8");
}

test("sheet and HUD readiness indicators share the Symbaroum weapon icon", () => {
  assert.equal(WEAPON_READINESS_ICON, "/systems/symbaroum/asset/image/weapon.png");
});

test("weapon readiness messages use the compact illustrated card when requested", () => {
  const html = buildWeaponReadinessChatContent({
    title: "Armas",
    text: "Crespo sacou Arco.",
    illustrated: true
  });

  assert.match(html, /tenebre-modern-chat-illustrated/);
  assert.match(html, /tenebre-modern-chat-simple-weapon-readiness/);
  assert.match(html, /Separador\.png/);
  assert.match(html, /Crespo sacou Arco\./);
  assert.doesNotMatch(html, /tenebre-weapon-readiness-chat/);
});

test("modern chat migrates stored weapon cards from the removed separator asset", () => {
  const modernChat = requireModernChatSource();
  assert.match(modernChat, /normalizeLegacyIllustratedSeparators\(content\)/);
  assert.match(modernChat, /illustrated-separator\.png/);
  assert.match(modernChat, /assets\/icons\/Separador\.png/);
});

test("weapon readiness cards use the shared illustrated separator styling", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const css = fs.readFileSync(path.join(root, "styles", "symbaroum-ind-resources.css"), "utf8");
  assert.doesNotMatch(css, /\.tenebre-modern-chat-simple-weapon-readiness \.tenebre-illustrated-separator/);
});

test("weapon readiness messages preserve legacy layout and escape content", () => {
  const html = buildWeaponReadinessChatContent({
    title: "Armas",
    text: "Crespo sacou <Arco>.",
    image: "weapon.png",
    illustrated: false
  });

  assert.match(html, /tenebre-weapon-readiness-chat/);
  assert.match(html, /weapon\.png/);
  assert.match(html, /Crespo sacou &lt;Arco&gt;\./);
  assert.doesNotMatch(html, /tenebre-modern-chat-illustrated/);
});

function weapon(id, { state = "active", reference = "1handed", readiness, qualities = {}, storedIn = "" } = {}) {
  return {
    id,
    type: "weapon",
    system: { state, reference, qualities },
    flags: readiness || storedIn
      ? { [scope]: {
        ...(readiness ? { [WEAPON_READINESS_FLAG]: readiness } : {}),
        ...(storedIn ? { storedIn } : {})
      } }
      : {},
    getFlag(flagScope, key) {
      return this.flags?.[flagScope]?.[key];
    }
  };
}

test("all accessible non-natural weapons participate in readiness", () => {
  assert.equal(isEligibleWeapon(weapon("active")), true);
  assert.equal(isEligibleWeapon(weapon("stored", { state: WEAPON_SHEATHED_STATE })), true);
  assert.equal(isEligibleWeapon(weapon("in-backpack", {
    state: WEAPON_SHEATHED_STATE,
    storedIn: "backpack"
  })), false);
  assert.equal(isEligibleWeapon(weapon("natural", { reference: "unarmed" })), false);
  assert.equal(isEligibleWeapon({ id: "armor", type: "armor", system: { state: "active" } }), false);
});

test("drawn state follows the native Symbaroum weapon state", () => {
  const drawn = weapon("sword", { state: "active", readiness: "drawn" });
  const sheathed = weapon("stored", { state: WEAPON_SHEATHED_STATE, readiness: "drawn" });
  assert.equal(isEligibleWeapon(drawn), true);
  assert.equal(isDrawn(drawn), true);
  assert.equal(drawn.system.state, "active");
  assert.equal(isDrawn(sheathed), false);
});

test("readiness patches move weapons between native active and equipment states", () => {
  const bow = weapon("bow", { state: WEAPON_SHEATHED_STATE });
  assert.deepEqual(buildWeaponReadinessPatches([bow], ["bow"]), [{
    _id: "bow",
    "system.state": "active",
    [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "drawn"
  }]);

  bow.system.state = "active";
  bow.flags[scope] = { [WEAPON_READINESS_FLAG]: "drawn" };
  assert.deepEqual(buildWeaponReadinessPatches([bow], []), [{
    _id: "bow",
    "system.state": WEAPON_SHEATHED_STATE,
    [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "sheathed"
  }]);
});

test("swapping weapons produces one atomic embedded-document patch set", () => {
  const bow = weapon("bow", { readiness: "drawn" });
  const dagger = weapon("dagger", { state: WEAPON_SHEATHED_STATE });
  assert.deepEqual(buildWeaponReadinessPatches([bow, dagger], ["dagger"]), [
    {
      _id: "bow",
      "system.state": WEAPON_SHEATHED_STATE,
      [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "sheathed"
    },
    {
      _id: "dagger",
      "system.state": "active",
      [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "drawn"
    }
  ]);
});

test("multiple drawn weapons and sheathe-all are supported", () => {
  const sword = weapon("sword");
  const dagger = weapon("dagger");
  assert.equal(buildWeaponReadinessPatches([sword, dagger], ["sword", "dagger"]).length, 2);

  sword.flags[scope] = { [WEAPON_READINESS_FLAG]: "drawn" };
  dagger.flags[scope] = { [WEAPON_READINESS_FLAG]: "drawn" };
  assert.equal(buildWeaponReadinessPatches([sword, dagger], []).every((patch) => (
    patch["system.state"] === WEAPON_SHEATHED_STATE
    &&
    patch[`flags.${scope}.${WEAPON_READINESS_FLAG}`] === "sheathed"
  )), true);
});

test("weapon hand costs follow the physical Symbaroum limits represented by the system", () => {
  assert.equal(getWeaponHandCost(weapon("sword")), 1);
  assert.equal(getWeaponHandCost(weapon("spear", { reference: "long" })), 2);
  assert.equal(getWeaponHandCost(weapon("greatsword", { reference: "heavy" })), 2);
  assert.equal(getWeaponHandCost(weapon("bastard", { reference: "heavy", qualities: { bastard: true } })), 2);
  assert.equal(getWeaponHandCost(weapon("bow", { reference: "ranged" })), 2);
  assert.equal(getWeaponHandCost(weapon("shield", { reference: "shield" })), 1);
  assert.equal(getWeaponHandCost(weapon("buckler", { reference: "shield", qualities: { flexible: true } })), 0);
  assert.equal(getWeaponHandUsage([
    weapon("sword"),
    weapon("dagger", { reference: "short" })
  ], ["sword", "dagger"]), 2);
});

test("sheathed eligible weapons cannot attack while drawn and natural weapons remain usable", () => {
  assert.equal(canAttackWithWeapon(weapon("sheathed", { state: WEAPON_SHEATHED_STATE })), false);
  assert.equal(canAttackWithWeapon(weapon("drawn", { state: "active", readiness: "drawn" })), true);
  assert.equal(canAttackWithWeapon(weapon("inactive", { state: "equipped" })), false);
  assert.equal(canAttackWithWeapon(weapon("natural", { reference: "unarmed" })), true);
});

test("prepared system weapons resolve to their embedded Item before attack validation", () => {
  const item = weapon("sword", { readiness: "drawn" });
  const actor = {
    items: {
      get(id) {
        return id === item.id ? item : null;
      },
      *[Symbol.iterator]() {
        yield item;
      }
    }
  };
  assert.equal(resolveWeaponItem(actor, { id: "sword" }), item);
  assert.equal(resolveWeaponItem(actor, { id: "missing" }), null);
});

test("the token indicator is namespaced and mechanically empty", () => {
  const data = buildVisualActiveEffectData({
    name: "Drawn weapon: Sword",
    img: "sword.webp",
    statuses: [`${scope}.weapon-readiness`],
    flags: { [scope]: { [WEAPON_READINESS_INDICATOR_FLAG]: true } }
  }, 13);

  assert.deepEqual(data.changes, []);
  assert.equal(data.transfer, false);
  assert.equal("showIcon" in data, false);
  assert.equal(isWeaponReadinessIndicatorEffect({ flags: data.flags }), true);
});

test("Foundry v14 visual effects explicitly request a token icon", () => {
  const data = buildVisualActiveEffectData({ name: "Indicator", img: "weapon.webp" }, 14);
  assert.equal(data.showIcon, 2);
  assert.equal(data.img, "weapon.webp");
});
