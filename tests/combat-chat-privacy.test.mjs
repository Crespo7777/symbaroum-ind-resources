import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privacySource = fs.readFileSync(path.join(root, "scripts/combat-chat-privacy.mjs"), "utf8");

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
  responsibleGmId,
  shouldHidePublicCombatCopy
} = await import("../scripts/combat-chat-privacy.mjs");
const { effectiveRollValue, opposedTargetModifier, protectionFromTotals } = await import("../scripts/combat-chat-utils.mjs");

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
          attackerImg: "actors/heroi.webp",
          weaponName: "Arco",
          weaponImg: "items/arco.webp",
          targetName: "Ogro",
          targetImg: "actors/ogro.webp",
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
  assert.match(data.content, /data-tenebre-attacker-img="actors\/heroi\.webp"/);
  assert.match(data.content, /data-tenebre-weapon-img="items\/arco\.webp"/);
  assert.match(data.content, /data-tenebre-target-img="actors\/ogro\.webp"/);
  assert.doesNotMatch(data.content, /background-image|<img/i);
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

test("GM hides the sanitized public copy while players keep seeing it", () => {
  const publicCopy = {
    flags: {
      "symbaroum-ind-resources": {
        combatSplitSourceId: "split-public"
      }
    }
  };
  const fullGmCopy = {
    flags: {
      "symbaroum-ind-resources": {
        combatSplitId: "split-public",
        fullCombatForGm: true
      }
    }
  };

  assert.equal(shouldHidePublicCombatCopy(publicCopy, { isGM: true }), true);
  assert.equal(shouldHidePublicCombatCopy(publicCopy, { isGM: false }), false);
  assert.equal(shouldHidePublicCombatCopy(fullGmCopy, { isGM: true }), false);
});

test("public combat payload omits NPC protection and final applied damage", () => {
  assert.doesNotMatch(privacySource, /protectionValue|appliedDamage|DamageTaken/);
});
