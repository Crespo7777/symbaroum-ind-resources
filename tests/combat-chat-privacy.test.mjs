import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privacySource = fs.readFileSync(path.join(root, "scripts/combat-chat-privacy.mjs"), "utf8");
const modernChatSource = fs.readFileSync(path.join(root, "scripts/modern-chat.mjs"), "utf8");

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (Base) => class extends Base {}
    }
  },
  utils: {}
};
const {
  CombatChatPrivacyService,
  opposedFormula,
  publicCombatMessageData,
  responsibleGmId
} = await import("../scripts/combat-chat-privacy.mjs");
const { effectiveRollValue, opposedTargetModifier, protectionFromTotals } = await import("../scripts/modern-chat.mjs");

test("opposed combat tests expose attribute names without numeric target values", () => {
  assert.equal(opposedFormula("Preciso : (20) ⬅ Defesa : (-3) Mod: 1"), "Preciso ← Defesa");
  assert.equal(opposedFormula("Vigoroso (10) ← Defesa (-5)"), "Vigoroso ← Defesa");
  assert.equal(opposedFormula("Rápido (14) ← Vigilante (7)"), "Rápido ← Vigilante");
});

test("rare critical preserves the first d20 as the effective result", () => {
  assert.equal(
    effectiveRollValue("Resultado da rolagem de dados: 1 - Resultado da rolagem de dados com crítico raro: 11"),
    "1"
  );
  assert.equal(effectiveRollValue("Roll: 20 - rare critical result: 8"), "20");
  assert.equal(effectiveRollValue("Rolagem: 14"), "14");
});

test("opposed target modifiers preserve native values or derive 10 minus the raw attribute", () => {
  assert.equal(opposedTargetModifier("-5", 15), -5);
  assert.equal(opposedTargetModifier("0", 10), 0);
  assert.equal(opposedTargetModifier("3", 7), 3);
  assert.equal(opposedTargetModifier("", 15), -5);
  assert.equal(opposedTargetModifier("", 7), 3);
});

test("opposed combat target follows the native Symbaroum modifier direction", () => {
  assert.equal(12 + opposedTargetModifier("-3", 13), 9);
  assert.equal(12 + opposedTargetModifier("3", 7), 15);
});

test("GM protection is derived from caused and applied damage without negative values", () => {
  assert.equal(protectionFromTotals(7, 4), "3");
  assert.equal(protectionFromTotals(4, 4), "0");
  assert.equal(protectionFromTotals(2, 5), "0");
  assert.equal(protectionFromTotals("", 1), "");
});

test("privacy parser aggregates separated rare-critical result paragraphs", () => {
  assert.match(privacySource, /filter\(\(text\) => \/\(\?:Rolagem\|Roll\|Result\)/);
  assert.match(privacySource, /\.join\(" - "\)/);
});

test("NPC combat is split into a blind GM original and sanitized public message", () => {
  assert.match(privacySource, /Hooks\.on\("preCreateChatMessage"/);
  assert.match(privacySource, /message\.updateSource\(\{ whisper: gmIds, blind: true, flags \}\)/);
  assert.match(privacySource, /fullCombatForGm: true/);
  assert.match(privacySource, /combatSplitId: splitId/);
  assert.match(privacySource, /publicCombatPayload: publicCombat/);
  assert.match(privacySource, /game\.user\?\.id !== responsibleGmId\(\)/);
  assert.match(privacySource, /combatSplitSourceId: splitId/);
  assert.doesNotMatch(privacySource, /pendingPublicMessages/);
  assert.match(privacySource, /publicCombat/);
  assert.match(modernChatSource, /!game\.user\?\.isGM && message\?\.flags\?\.\[MODULE_ID\]\?\.fullCombatForGm/);
});

test("one deterministic active GM publishes the sanitized copy", () => {
  const users = [
    { id: "gm-z", isGM: true, active: true },
    { id: "player", isGM: false, active: true },
    { id: "gm-a", isGM: true, active: true },
    { id: "gm-offline", isGM: true, active: false }
  ];
  assert.equal(responsibleGmId(users), "gm-a");
  assert.equal(responsibleGmId(users.filter((user) => !user.active)), "");
});

test("sanitized copy preserves public combat data without GM-only fields", () => {
  globalThis.game = {
    user: { id: "gm-a" },
    i18n: { lang: "pt-BR" }
  };
  const message = {
    author: { id: "player-a" },
    speaker: { actor: "actor-a", alias: "Heroi" },
    flags: {
      "symbaroum-ind-resources": {
        combatSplitId: "split-a",
        publicCombatPayload: {
          attackerName: "Heroi",
          weaponName: "Arco",
          targetName: "Ogro",
          testFormula: "Preciso ← Defesa",
          rollValue: "7",
          outcomeText: "Heroi falha - Falha Crítica : Ataque Livre do Oponente",
          damageFormula: "1d8",
          damageTotal: 5
        }
      }
    }
  };
  const data = publicCombatMessageData(message);
  assert.equal(data.user, "player-a");
  assert.equal(data.flags["symbaroum-ind-resources"].combatSplitSourceId, "split-a");
  assert.equal(data.flags["symbaroum-ind-resources"].publicCombat.testFormula, "Preciso ← Defesa");
  assert.doesNotMatch(data.content, /Proteção|Dano final|Damage taken/i);
  assert.match(data.content, /Preciso ← Defesa/);
  assert.match(data.content, /Ataque Livre do Oponente/);
});

test("only the responsible GM publishes one public copy for a player attack", async () => {
  const callbacks = new Map();
  globalThis.Hooks = {
    on(name, callback) {
      callbacks.set(name, callback);
    }
  };
  const created = [];
  globalThis.ChatMessage = {
    implementation: {
      async create(data) {
        created.push(data);
        globalThis.game.messages.push({ flags: data.flags });
        return data;
      }
    }
  };
  globalThis.game = {
    user: { id: "gm-a", isGM: true },
    users: [
      { id: "player-a", isGM: false, active: true },
      { id: "gm-b", isGM: true, active: true },
      { id: "gm-a", isGM: true, active: true }
    ],
    messages: [],
    i18n: { lang: "pt-BR" }
  };
  const message = {
    author: { id: "player-a" },
    speaker: { actor: "actor-a", alias: "Heroi" },
    flags: {
      "symbaroum-ind-resources": {
        combatSplitId: "split-hook",
        publicCombatPayload: {
          attackerName: "Heroi",
          weaponName: "Arco",
          targetName: "Ogro",
          testFormula: "Preciso ← Defesa",
          rollValue: "8",
          outcomeText: "Heroi acerta Ogro",
          damageFormula: "1d8",
          damageTotal: 4
        }
      }
    }
  };

  CombatChatPrivacyService.register();
  callbacks.get("createChatMessage")(message);
  await new Promise((resolve) => setImmediate(resolve));
  callbacks.get("createChatMessage")(message);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(created.length, 1);

  globalThis.game.user = { id: "player-a", isGM: false };
  callbacks.get("createChatMessage")({
    ...message,
    flags: {
      "symbaroum-ind-resources": {
        ...message.flags["symbaroum-ind-resources"],
        combatSplitId: "split-player"
      }
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(created.length, 1);
});

test("public combat rendering omits NPC protection and final applied damage", () => {
  const combatBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildCombatCard"),
    modernChatSource.indexOf("function buildAbilityRollCard")
  );
  assert.match(combatBuilder, /gmCombat && appliedDamage/);
  assert.match(combatBuilder, /const protection = gmCombat/);
  assert.match(combatBuilder, /explicitProtection \|\| \(damage \? protectionValue/);
  assert.doesNotMatch(privacySource, /protectionValue|appliedDamage|DamageTaken/);
});

test("illustrated combat and attribute cards consume the native final roll state", () => {
  assert.match(modernChatSource, /function finalNativeD20Element\(source\)/);
  assert.match(modernChatSource, /source\?\.querySelectorAll\?\.\("\.symba-rolls\.roll\.d20"\)/);
  assert.match(modernChatSource, /\.dice-roll \.dice-total \.symba-rolls\.roll\.d20/);
  assert.match(modernChatSource, /function nativeRollTooltipText\(source\)/);
  assert.match(modernChatSource, /rollDetails: gmCombat \? nativeRoll\.details : ""/);
  assert.match(modernChatSource, /rollDetails: nativeRoll\.details/);
  assert.match(modernChatSource, /source\.querySelector\?\.\("#applyEffect"\)/);
  assert.match(modernChatSource, /const nativeRoll = nativeFinalRollState\(source, text\)/);
  assert.match(modernChatSource, /const nativeRoll = nativeFinalRollState\(rollCard, text\)/);
  assert.match(modernChatSource, /const critical = nativeRoll\.critical \|\| criticalState/);
  assert.match(modernChatSource, /const resultKey = miss[\s\S]*hit && critical === "success"/);
  assert.match(modernChatSource, /const resultKey = failure[\s\S]*success && critical === "success"/);
  assert.match(modernChatSource, /outcome: hit \? "success" : miss \? "failure" : ""/);
  assert.match(modernChatSource, /function nativeCombatEffectRows\(source, \{ includeDamageConsequences = false \} = \{\}\)/);
  assert.match(modernChatSource, /"CHAT\.CRITICAL_FAILURE_FREEATTACK"/);
  assert.match(modernChatSource, /"CHAT\.CRITICAL_FREEATTACK"/);
  assert.match(modernChatSource, /"CHAT\.CRITICAL_PLUS3DAMAGE"/);
  assert.match(modernChatSource, /"COMBAT\.CHAT_DAMAGE_NUL"/);
  assert.match(modernChatSource, /"COMBAT\.CHAT_DAMAGE_DYING"/);
  assert.match(modernChatSource, /"COMBAT\.CHAT_DAMAGE_PAIN"/);
  assert.match(modernChatSource, /"COMBAT\.CHAT_DMG_PARAMS"/);
  assert.match(modernChatSource, /const nativeEffects = nativeCombatEffectRows\(source, \{ includeDamageConsequences: gmCombat \}\)/);
  const attributeBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildAttributeRollCard"),
    modernChatSource.indexOf("function buildDeathRollCard")
  );
  assert.match(attributeBuilder, /const nativeEffects = nativeCombatEffectRows\(rollCard\)/);
  assert.match(attributeBuilder, /\.\.\.nativeEffects/);
  const deathBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildDeathRollCard"),
    modernChatSource.indexOf("function buildApplyResultsCard")
  );
  assert.match(deathBuilder, /rollDetails: nativeRollDetailsText\(rollCard\)/);
  assert.match(modernChatSource, /value\.fullRow/);
  assert.match(modernChatSource, /const textHit = \/\\b\(acerta\|hits\?\)\\b\/i\.test\(text\)/);
  assert.match(modernChatSource, /const hit = textHit \|\| \(!textMiss && nativeRoll\.status === "success"\)/);
});

test("generic native ability cards are illustrated without hard-coded ability names", () => {
  const abilityBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildAbilityRollCard"),
    modernChatSource.indexOf("function buildAttributeRollCard")
  );
  assert.match(abilityBuilder, /source\.querySelector\?\.\("\.symbaroum\.chat\.ability"\)/);
  assert.match(abilityBuilder, /\.finalTxt p\[data-item-id\]/);
  assert.match(abilityBuilder, /targetedSequence: Boolean\(targetName\)/);
  assert.match(abilityBuilder, /itemUuid: abilityItem\?\.uuid/);
  assert.doesNotMatch(abilityBuilder, /Cascata de Enxofre|Sulphur Cascade/i);
});

/*
test("GM attack cards include hidden-test values and objective while public cards do not", () => {
  const combatBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildCombatCard"),
    modernChatSource.indexOf("function buildAbilityRollCard")
  );
  assert.match(combatBuilder, /attackTestAttributeValues\(findAttributeLine\(text\), actor, targetActor\)/);
  assert.match(modernChatSource, /data\.attackTestValues[\s\S]{0,80}illustratedAttackTestHtml/);
  assert.match(modernChatSource, /illustratedAttackObjectiveHtml\(data\.attackTestValues\)/);
  assert.match(modernChatSource, /hideAttackFlavor: gmCombat/);
  assert.match(modernChatSource, /const defenseFirst = \["defesa", "defense"\]/);
  assert.match(modernChatSource, /const leftActor = defenseFirst \? targetActor : actor/);
  assert.match(modernChatSource, /const rightActor = defenseFirst \? actor : targetActor/);
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[0\], leftActor\)/);
  assert.match(modernChatSource, /opposedTargetAttributeValue\(parts\[1\], rightActor\)/);
  assert.match(modernChatSource, /return Number\.isFinite\(raw\) \? 10 - raw : NaN/);
  assert.match(modernChatSource, /match\(\/\^\(\.\+\?\)\\s\*:\?\\s\*\\\(\\s\*\(-\\?\\d\+\)/);
  assert.match(modernChatSource, /gmOnly: Boolean\(data\.gmCombat\)/);
  assert.match(combatBuilder, /protection !== ""/);
});
*/

test("GM attack cards preserve test values and GM-only details", () => {
  const combatBuilder = modernChatSource.slice(
    modernChatSource.indexOf("function buildCombatCard"),
    modernChatSource.indexOf("function buildAbilityRollCard")
  );
  assert.match(combatBuilder, /attackTestAttributeValues\(findAttributeLine\(text\), actor, targetActor\)/);
  assert.match(modernChatSource, /data\.attackTestValues[\s\S]{0,80}illustratedAttackTestHtml/);
  assert.match(modernChatSource, /illustratedAttackObjectiveHtml\(data\.attackTestValues\)/);
  assert.match(modernChatSource, /hideAttackFlavor: gmCombat/);
  assert.match(modernChatSource, /const defenseFirst = \["defesa", "defense"\]/);
  assert.match(modernChatSource, /const leftActor = defenseFirst \? targetActor : actor/);
  assert.match(modernChatSource, /const rightActor = defenseFirst \? actor : targetActor/);
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[0\], leftActor\)/);
  assert.match(modernChatSource, /opposedTargetAttributeValue\(parts\[1\], rightActor\)/);
  assert.match(modernChatSource, /cleanName\(part\)\.match\(/);
  assert.match(modernChatSource, /operator: right < 0 \? "-" : "\+"/);
  assert.match(modernChatSource, /right: Math\.abs\(right\)/);
  assert.match(modernChatSource, /result: left \+ right/);
  assert.match(modernChatSource, /gmOnly: Boolean\(data\.gmCombat\)/);
  assert.match(combatBuilder, /protection !== ""/);
});
