import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const itemUse = fs.readFileSync(path.join(root, "scripts", "chat-item-use.mjs"), "utf8");
const modernChat = fs.readFileSync(path.join(root, "scripts", "modern-chat.mjs"), "utf8");

assert.match(itemUse, /isEquipment:\s*item\.type === "equipment" \|\| item\.system\?\.isEquipment === true/, "Equipment use messages must carry stable type metadata");
assert.match(modernChat, /buildRationUseCard\(message, source, text\)\s*\n\s*\?\? buildEquipmentUseCard\(message\)/, "Ration cards must remain more specific than generic equipment cards");
assert.match(modernChat, /flags\?\.chatItemUse !== true \|\| flags\?\.isEquipment !== true/, "Only explicit equipment-use messages may use the compact equipment card");
assert.match(modernChat, /TENEBRE\.ModernChat\.EquipmentFlavor/, "Equipment cards must use localized compact text");
assert.match(modernChat, /linkedItemFlavorHtml\(flavor, \{ itemName, itemUuid \}\)/, "Equipment names in compact chat cards must open their Item document");
assert.match(modernChat, /gmLogAction\?\.subjectUuid\s*\n\s*\|\| rationItem\?\.uuid/, "Ration cards must preserve their equipment UUID link");
assert.match(modernChat, /linkedItemFlavorHtml\(flavor, \{ itemName: displayName, itemUuid \}\)/, "Ration names must open their Item document");
assert.match(modernChat, /const isExplicitUse = source\.querySelector\("\.tenebre-chat-item-use"\)/, "Generic item cards must distinguish explicit use from informational sharing");
assert.match(modernChat, /if \(!isExplicitUse\) return null;/, "Informational native Item cards must remain intact instead of becoming compact use cards");
assert.doesNotMatch(modernChat, /if \(!isExplicitUse && !symbaroumCard\) return null;/, "Native Item cards alone must not be treated as item use");

console.log("equipment chat use tests passed");
