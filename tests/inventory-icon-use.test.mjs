import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "scripts", "sheet-ui.mjs"), "utf8");

assert.match(
  source,
  /\.gear \.item-row\.item\[data-item-id\] \.image-container > \.image/,
  "Item use must include inventory icons"
);
const inventoryWire = source.slice(
  source.indexOf("function wireInventoryItemIconUse"),
  source.indexOf("function wireContainerDragDrop")
);
assert.doesNotMatch(
  inventoryWire,
  /\.item-edit/,
  "Inventory names must retain the native View/Edit behavior"
);
assert.doesNotMatch(
  inventoryWire,
  /ContainerService\.openContainer/,
  "Inventory icons must use items instead of opening containers"
);
assert.match(source, /ChatItemUseService\.send\(actor, item\)/, "Item icons must use the existing item service");
assert.match(source, /control\.addEventListener\("keydown"/, "Non-native inventory controls must remain keyboard accessible");
assert.doesNotMatch(source, /wireContainerLeftClickOpen/, "Container names must not override native View/Edit");

const ritualItem = source.slice(
  source.indexOf("function buildRitualistItem"),
  source.indexOf("function wireChatItemUseIconFallback")
);
assert.match(ritualItem, /tenebre-ritualist-use/, "Grouped rituals must expose a use icon");
assert.match(ritualItem, /ChatItemUseService\.send\(actor, ritual\)/, "Grouped ritual icons must use the ritual");
assert.match(ritualItem, /tenebre-ritualist-name/, "Grouped rituals must expose a separate name control");
assert.match(ritualItem, /ritual\.sheet\?\.render\(true\)/, "Grouped ritual names must open View/Edit");

console.log("inventory icon use tests passed");
