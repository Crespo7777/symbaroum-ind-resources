import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const scriptSource = fs.readdirSync(path.join(root, "scripts"))
  .filter((name) => name.endsWith(".mjs"))
  .map((name) => read(path.join("scripts", name)))
  .join("\n");

const removedArtifacts = [
  "scripts/modern-chat.mjs",
  "data/modern-chat-flavor.json",
  "docs/chat-ilustrado-paridade.md",
  "assets/icons/Separador.png",
  "assets/icons/illustrated-d20.svg",
  "assets/icons/illustrated-roll-skull.png",
  "scripts/native-chat-presentation.mjs",
  "scripts/combat-chat-privacy.mjs",
  "scripts/combat-chat-utils.mjs"
];

test("illustrated chat artifacts remain removed", () => {
  for (const relativePath of removedArtifacts) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `Removed artifact returned: ${relativePath}`);
  }
});

test("removed native chat renderers and replacement publishers stay removed", () => {
  const source = read("scripts/init.mjs");
  assert.doesNotMatch(source, /ModernChatService|modernChat|NativeChatPresentationService|CombatChatPrivacyService/);
  assert.doesNotMatch(scriptSource, /tenebre-(?:native|public)-combat|tenebre-native-attack/);
  assert.doesNotMatch(scriptSource, /publicCombat:\s*true|publicCombatMessageId/);
});

test("settings UI does not expose removed native chat presentation options", () => {
  const sources = [
    read("scripts/settings.mjs"),
    read("templates/settings.hbs"),
    read("languages/pt-BR.json"),
    read("languages/en.json")
  ].join("\n");

  assert.doesNotMatch(sources, /enableModernChat|modernChatStyle|showSpecialAmmoInChat|nativeChatPresentation|TENEBRE\.(?:ModernChat|NativeChat)/);
});

test("module CSS does not target the core chat viewport or restore old native styles", () => {
  const css = read("styles/symbaroum-ind-resources.css");
  assert.doesNotMatch(css, /#chat-log|\.chat-sidebar\s+\.chat-scroll/);
  assert.doesNotMatch(css, /tenebre-native-|tenebre-public-combat/);
});

test("the native Symbaroum resistance-roll button is centered without changing other effect buttons", () => {
  const css = read("styles/symbaroum-ind-resources.css");
  assert.match(css, /\.symbaroum\.chat\.ability \.foreground > h4 ~ p:has\(> #applyEffect\)\s*\{[\s\S]*?justify-content:\s*center;/);
  assert.match(css, /h4 ~ p:has\(> #applyEffect\) > #applyEffect/);
  assert.doesNotMatch(css, /\.symbaroum\.chat\.ability\s+#applyEffect\s*\{/);
});

test("chat integrations remain registered without replacing native messages", () => {
  const initSource = read("scripts/init.mjs");
  const settingsSource = read("scripts/settings.mjs");

  assert.match(initSource, /RollPrivacyService\.register\(\)/);
  assert.match(initSource, /NpcAttackChatService\.register\(\)/);
  assert.match(initSource, /chatItemUse:\s*ChatItemUseService/);
  assert.match(initSource, /gmLog:\s*GmLogService/);
  assert.match(settingsSource, /register\("enableChatItemUse"/);
  assert.match(settingsSource, /register\("enableRollPrivacy"/);
  assert.match(settingsSource, /register\("enableCompactNpcAttackChat"/);
  assert.match(settingsSource, /register\("enableGmLog"/);
});
