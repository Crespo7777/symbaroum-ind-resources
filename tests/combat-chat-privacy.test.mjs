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

test("opposed combat tests expose attribute names without numeric target values", () => {
  assert.equal(opposedFormula("Preciso : (20) ⬅ Defesa : (-3) Mod: 1"), "Preciso ← Defesa");
  assert.equal(opposedFormula("Vigoroso (10) ← Defesa (-5)"), "Vigoroso ← Defesa");
  assert.equal(opposedFormula("Rápido (14) ← Vigilante (7)"), "Rápido ← Vigilante");
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
          outcomeText: "Heroi acerta Ogro",
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
  assert.match(combatBuilder, /gmCombat && damage \? protectionValue/);
  assert.doesNotMatch(privacySource, /protectionValue|appliedDamage|DamageTaken/);
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
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[0\], actor\)/);
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[1\], targetActor\)/);
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
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[0\], actor\)/);
  assert.match(modernChatSource, /parsedOrActorAttributeValue\(parts\[1\], targetActor\)/);
  assert.match(modernChatSource, /cleanName\(part\)\.match\(/);
  assert.match(modernChatSource, /operator: right < 0 \? "-" : "\+"/);
  assert.match(modernChatSource, /right: Math\.abs\(right\)/);
  assert.match(modernChatSource, /result: left \+ right/);
  assert.match(modernChatSource, /gmOnly: Boolean\(data\.gmCombat\)/);
  assert.match(combatBuilder, /protection !== ""/);
});
