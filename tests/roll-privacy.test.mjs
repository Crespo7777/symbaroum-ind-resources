import assert from "node:assert/strict";

let preCreateHook = null;
let rollPrivacyEnabled = true;
globalThis.Hooks = {
  on(name, callback) {
    if (name === "preCreateChatMessage") preCreateHook = callback;
  }
};
globalThis.game = {
  user: { id: "player", isGM: false },
  users: [
    { id: "gm", isGM: true },
    { id: "player", isGM: false }
  ],
  settings: {
    get(_moduleId, key) {
      if (key === "enableRollPrivacy") return rollPrivacyEnabled;
      return undefined;
    }
  },
  i18n: {
    localize(key) {
      if (key === "TENEBRE.RollPrivacy.Label") return "Rolagem privada";
      return "Somente o Mestre verá o resultado";
    }
  }
};
globalThis.foundry = { utils: { deepClone: (value) => structuredClone(value) } };
const { RollPrivacyService } = await import("../scripts/roll-privacy.mjs");
RollPrivacyService.register();

function createMessage({ rolls = [], flags = {} } = {}) {
  return {
    rolls,
    flags,
    updateSource(update) {
      Object.assign(this, update);
    }
  };
}

const publicRoll = createMessage({ rolls: [{ total: 7 }] });
preCreateHook(publicRoll, {}, {}, "player");
assert.equal(publicRoll.whisper, undefined);

await RollPrivacyService.runPrivateRoll(true, async () => {
  assert.equal(RollPrivacyService.isPrivateRollActive(), true);
  const privateRoll = createMessage({ rolls: [{ total: 7 }] });
  preCreateHook(privateRoll, {}, {}, "player");
  assert.deepEqual(privateRoll.whisper, ["gm"]);
  assert.equal(privateRoll.blind, true);
  assert.equal(privateRoll.flags["symbaroum-ind-resources"].privateRoll, true);

  const narrative = createMessage();
  preCreateHook(narrative, {}, {}, "player");
  assert.equal(narrative.whisper, undefined);
});

assert.equal(RollPrivacyService.isPrivateRollActive(), false);

await RollPrivacyService.runPrivateRoll(true, async () => undefined);
assert.equal(RollPrivacyService.isPrivateRollActive(), true, "delayed system roll lost its private intent");
const delayedPrivateRoll = createMessage({ rolls: [{ total: 19 }] });
preCreateHook(delayedPrivateRoll, {}, {}, "player");
assert.deepEqual(delayedPrivateRoll.whisper, ["gm"], "delayed system roll was published");
assert.equal(delayedPrivateRoll.blind, true);
assert.equal(RollPrivacyService.isPrivateRollActive(), false);

await RollPrivacyService.runPrivateRoll(true, async () => {
  const legacyRoll = createMessage();
  legacyRoll.roll = { total: 11 };
  preCreateHook(legacyRoll, {}, {}, "player");
  assert.deepEqual(legacyRoll.whisper, ["gm"], "legacy roll field was not made private");
});

await assert.rejects(
  RollPrivacyService.runPrivateRoll(true, async () => {
    throw new Error("expected failure");
  }),
  /expected failure/
);
assert.equal(RollPrivacyService.isPrivateRollActive(), false, "privacy context leaked after an error");

const injected = RollPrivacyService.injectField(`
  <div class="symbaroum dialog">
    <div class="bonus">Modifier</div>
    <div class="favour">Favour</div>
  </div>
`);
assert.equal(injected.includes('name="tenebrePrivateRoll"'), true);
assert.equal(injected.indexOf("tenebre-private-roll-option") < injected.indexOf('<div class="favour">'), true);
assert.equal(RollPrivacyService.injectField(injected), injected, "private option was injected twice");

const diceSoNiceMessage = createMessage({
  flags: { "symbaroum-ind-resources": { privateRollCandidate: true } }
});
await RollPrivacyService.runPrivateRoll(true, async () => {
  preCreateHook(diceSoNiceMessage, {}, {}, "player");
});
assert.deepEqual(diceSoNiceMessage.whisper, ["gm"]);
await Promise.resolve();

rollPrivacyEnabled = false;
assert.equal(RollPrivacyService.fieldHtml(), "");
assert.equal(RollPrivacyService.injectField("<div>Roll</div>"), "<div>Roll</div>");
await RollPrivacyService.runPrivateRoll(true, async () => {
  assert.equal(RollPrivacyService.isPrivateRollActive(), false);
});

console.log("roll privacy tests passed");
