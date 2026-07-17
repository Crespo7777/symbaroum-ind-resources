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
assert.match(
  source,
  /\.gear \.item-row\.item\[data-item-id\] \.item-edit/,
  "Item use must include inventory names"
);
assert.match(source, /ContainerService\.openContainer\(actor, item\)/, "Container icons must open containers");
assert.match(source, /ChatItemUseService\.send\(actor, item\)/, "Item icons must use the existing item service");
assert.match(source, /control\.addEventListener\("keydown"/, "Non-native inventory controls must remain keyboard accessible");

console.log("inventory icon use tests passed");
