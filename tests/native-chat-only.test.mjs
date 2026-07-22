import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const removedArtifacts = [
  "scripts/modern-chat.mjs",
  "data/modern-chat-flavor.json",
  "docs/chat-ilustrado-paridade.md",
  "assets/icons/Separador.png",
  "assets/icons/illustrated-d20.svg",
  "assets/icons/illustrated-roll-skull.png"
];

test("illustrated chat artifacts remain removed", () => {
  for (const relativePath of removedArtifacts) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `Removed artifact returned: ${relativePath}`);
  }
});

test("bootstrap and public module API do not register the illustrated chat renderer", () => {
  const source = read("scripts/init.mjs");
  assert.doesNotMatch(source, /ModernChatService|modernChat/);
});

test("settings UI does not expose removed illustrated chat options", () => {
  const sources = [
    read("scripts/settings.mjs"),
    read("templates/settings.hbs"),
    read("languages/pt-BR.json"),
    read("languages/en.json")
  ].join("\n");

  assert.doesNotMatch(sources, /enableModernChat|modernChatStyle|showSpecialAmmoInChat|TENEBRE\.ModernChat/);
});

test("independent native chat integrations remain registered", () => {
  const initSource = read("scripts/init.mjs");
  const settingsSource = read("scripts/settings.mjs");

  assert.match(initSource, /RollPrivacyService\.register\(\)/);
  assert.match(initSource, /CombatChatPrivacyService\.register\(\)/);
  assert.match(initSource, /chatItemUse:\s*ChatItemUseService/);
  assert.match(initSource, /gmLog:\s*GmLogService/);
  assert.match(settingsSource, /register\("enableChatItemUse"/);
  assert.match(settingsSource, /register\("enableRollPrivacy"/);
  assert.match(settingsSource, /register\("enableGmLog"/);
});
