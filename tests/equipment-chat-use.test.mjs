import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const itemUse = fs.readFileSync(path.join(root, "scripts", "chat-item-use.mjs"), "utf8");

assert.match(itemUse, /isEquipment:\s*item\.type === "equipment" \|\| item\.system\?\.isEquipment === true/, "Equipment use messages must carry stable type metadata");
assert.match(itemUse, /!ContainerService\.isContainer\(item\)/, "Containers must not be sent as used equipment");
