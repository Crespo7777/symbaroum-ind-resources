import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getAmmoRecoveryClass,
  getAmmoRecoveryThreshold,
  getSpecialAmmo
} from "../scripts/special-ammo.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundles = JSON.parse(fs.readFileSync(path.join(root, "data/encumbrance-weights.json"), "utf8")).bundles;
const modernChatSource = fs.readFileSync(path.join(root, "scripts/modern-chat.mjs"), "utf8");
const ammoSource = fs.readFileSync(path.join(root, "scripts/ammo.mjs"), "utf8");

const officialProjectiles = [
  ["Flechas/Virotes - Regulares", "Arrows/Bolts - Regular", "common", 10, false],
  ["Flecha - Arpéu", "Arrow - Grappling Hook", "quality", 15, true],
  ["Flecha - Cabeça de Martelo", "Arrow - Hammer Head", "quality", 15, true],
  ["Flecha - Cauda de Andorinha", "Arrow - Swallow’s Tail", "quality", 15, true],
  ["Flecha - Cortador de Corda", "Arrow - Rope Cutter", "quality", 15, true],
  ["Flecha - Flamejante", "Arrow - Flame", "quality", 15, true],
  ["Flecha - de Laço", "Arrow - Snaring", "quality", 15, true],
  ["Flecha - Precisão", "Arrow - Precision", "quality", 15, true],
  ["Flecha - Ponta Perfurante de Armadura", "Arrow - Armor-piercing Head", "quality", 15, true],
  ["Flecha - Sibilante", "Arrow - Whistler", "quality", 15, true],
  ["Flecha Certeira", "True Arrow", "mystical", 17, true],
  ["Raio Atordoante", "Stun Bolt", "mystical", 17, true]
];

for (const [ptName, enName, recoveryClass, threshold, special] of officialProjectiles) {
  for (const name of [ptName, enName]) {
    const item = { name, type: "equipment", getFlag: () => undefined };
    assert.equal(getAmmoRecoveryClass(item), recoveryClass, `${name} recovery class`);
    assert.equal(getAmmoRecoveryThreshold(item), threshold, `${name} recovery threshold`);
    assert.equal(Boolean(getSpecialAmmo(item)), special, `${name} special-ammunition classification`);
    assert.equal(Boolean(bundles[name]), true, `${name} must have an encumbrance bundle rule`);
  }
}

const flaggedItem = {
  name: "Custom Projectile",
  type: "equipment",
  getFlag(_scope, key) {
    if (key === "isAmmo") return true;
    if (key === "ammoRecoveryClass") return "mystical";
    if (key === "ammoRecoveryThreshold") return 19;
    return undefined;
  }
};
assert.equal(getAmmoRecoveryClass(flaggedItem), "mystical");
assert.equal(getAmmoRecoveryThreshold(flaggedItem), 19);

assert.doesNotMatch(modernChatSource, /tenebre-illustrated-ammo-link/, "ammunition must not create a separate chat line");
assert.match(modernChatSource, /tenebre-illustrated-inline-item-link/, "ammunition must be linked inside the attack narrative");
assert.doesNotMatch(
  modernChatSource.match(/function illustratedFlavorHtml[\s\S]*?\n}/)?.[0] ?? "",
  /ammoSpecial/,
  "regular and special ammunition must both be linkable"
);
assert.match(ammoSource, /data-ammo-uuid=/, "reload messages must preserve the ammunition source UUID");
assert.match(
  ammoSource.slice(
    ammoSource.indexOf("function snapshotAmmoMetadata"),
    ammoSource.indexOf("async function createRecoveredAmmo")
  ),
  /\.find\(Boolean\)/,
  "empty source UUIDs must fall back to the item or document UUID"
);
assert.match(modernChatSource, /tenebre-modern-chat-simple-reload/, "reload messages must use the compact text-only card");
assert.match(modernChatSource, /tenebre-modern-chat-simple-recovery/, "recovery messages must use the compact text-only card");
assert.match(
  modernChatSource.slice(
    modernChatSource.indexOf("function buildAmmoRecoveryCard"),
    modernChatSource.indexOf("function buildAmmoReloadCard")
  ),
  /linkedItemFlavorHtml/,
  "recovery messages must link the recovered projectile"
);

console.log(`special ammunition tests passed (${officialProjectiles.length} official projectiles)`);
