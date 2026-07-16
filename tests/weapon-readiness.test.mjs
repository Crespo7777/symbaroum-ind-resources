import assert from "node:assert/strict";
import test from "node:test";

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
  WEAPON_READINESS_FLAG
} from "../scripts/weapon-readiness.mjs";
import {
  isWeaponReadinessIndicatorEffect,
  WEAPON_READINESS_INDICATOR_FLAG
} from "../scripts/weapon-readiness-visuals.mjs";
import { buildVisualActiveEffectData } from "../scripts/compatibility.mjs";

const scope = "symbaroum-ind-resources";
globalThis.game = { symbaroum: {} };

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
  assert.match(html, /illustrated-separator\.png/);
  assert.match(html, /Crespo sacou Arco\./);
  assert.doesNotMatch(html, /tenebre-weapon-readiness-chat/);
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

function weapon(id, { state = "active", reference = "1handed", readiness, qualities = {} } = {}) {
  return {
    id,
    type: "weapon",
    system: { state, reference, qualities },
    flags: readiness ? { [scope]: { [WEAPON_READINESS_FLAG]: readiness } } : {},
    getFlag(flagScope, key) {
      return this.flags?.[flagScope]?.[key];
    }
  };
}

test("only active, non-natural weapons participate in readiness", () => {
  assert.equal(isEligibleWeapon(weapon("active")), true);
  assert.equal(isEligibleWeapon(weapon("equipped", { state: "equipped" })), false);
  assert.equal(isEligibleWeapon(weapon("natural", { reference: "unarmed" })), false);
  assert.equal(isEligibleWeapon({ id: "armor", type: "armor", system: { state: "active" } }), false);
});

test("drawn state is independent from the native Symbaroum state", () => {
  const drawn = weapon("sword", { readiness: "drawn" });
  assert.equal(isEligibleWeapon(drawn), true);
  assert.equal(isDrawn(drawn), true);
  assert.equal(drawn.system.state, "active");
});

test("swapping weapons produces one atomic embedded-document patch set", () => {
  const bow = weapon("bow", { readiness: "drawn" });
  const dagger = weapon("dagger");
  assert.deepEqual(buildWeaponReadinessPatches([bow, dagger], ["dagger"]), [
    { _id: "bow", [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "sheathed" },
    { _id: "dagger", [`flags.${scope}.${WEAPON_READINESS_FLAG}`]: "drawn" }
  ]);
});

test("multiple drawn weapons and sheathe-all are supported", () => {
  const sword = weapon("sword");
  const dagger = weapon("dagger");
  assert.equal(buildWeaponReadinessPatches([sword, dagger], ["sword", "dagger"]).length, 2);

  sword.flags[scope] = { [WEAPON_READINESS_FLAG]: "drawn" };
  dagger.flags[scope] = { [WEAPON_READINESS_FLAG]: "drawn" };
  assert.equal(buildWeaponReadinessPatches([sword, dagger], []).every((patch) => (
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
  assert.equal(canAttackWithWeapon(weapon("sheathed")), false);
  assert.equal(canAttackWithWeapon(weapon("drawn", { readiness: "drawn" })), true);
  assert.equal(canAttackWithWeapon(weapon("inactive", { state: "other" })), false);
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
