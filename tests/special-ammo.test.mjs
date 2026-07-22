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
const ammoSource = fs.readFileSync(path.join(root, "scripts/ammo.mjs"), "utf8");
const gmLogServiceSource = fs.readFileSync(path.join(root, "scripts/gm-log-service.mjs"), "utf8");

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

assert.match(ammoSource, /data-ammo-uuid=/, "reload messages must preserve the ammunition source UUID");
assert.match(
  ammoSource.slice(
    ammoSource.indexOf("function snapshotAmmoMetadata"),
    ammoSource.indexOf("async function createRecoveredAmmo")
  ),
  /\.find\(Boolean\)/,
  "empty source UUIDs must fall back to the item or document UUID"
);
assert.match(ammoSource, /createRecoverySessionMessage\(session, actor\)/, "recovery must create one session message per recovery action");
assert.match(ammoSource, /updateRecoverySessionMessage\(session\)/, "recovery attempts must update the existing session message");
assert.match(ammoSource, /showDice3dRoll\(result\.roll\)/, "each recovery attempt must retain its dice animation");
const recoverySource = ammoSource.slice(ammoSource.indexOf("static async recover(actor)"), ammoSource.indexOf("  static async #recoverOne"));
assert.match(recoverySource, /await appendRecoveryAttempt\(session, result, actor\);\s+while \(result\?\.remaining > 0\)/, "one recovery click must process all pending projectiles");
assert.doesNotMatch(recoverySource, /session\.message = await createRecoverySessionMessage\(session, actor\);\s+\s*let result/, "the first recovery message must not be created before the first roll");
assert.doesNotMatch(recoverySource, /rollAmmoRecoveryPerProjectile/, "recovery must not stop after one projectile because of the removed per-click setting");
const recoveryAttemptSource = ammoSource.slice(ammoSource.indexOf("async function appendRecoveryAttempt"), ammoSource.indexOf("async function finishRecoverySession"));
assert.match(recoveryAttemptSource, /if \(result\.roll\) await showDice3dRoll\(result\.roll\);\s+\s*session\.attempts\.push[\s\S]*?if \(session\.message\)[\s\S]*?else if \(actor\)[\s\S]*?session\.message = await createRecoverySessionMessage\(session, actor\);/, "the recovery message must wait for the dice animation before creating or updating the card");
assert.doesNotMatch(ammoSource, /Recovery\.SessionAttempt(?:Success|Failure|Skipped)/, "the legacy recovery card must not render a per-projectile attempt list");
assert.match(gmLogServiceSource, /Hooks\.on\("updateChatMessage"/, "the GM log must follow recovery message updates");

console.log(`special ammunition tests passed (${officialProjectiles.length} official projectiles)`);
