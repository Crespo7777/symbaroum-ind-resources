import { MODULE_ID, AMMO_TYPES } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { patchWeaponRolls } from "./weapon-wrapper.mjs";
import { registerSheetHooks } from "./sheet-ui.mjs";
import { RationService } from "./rations.mjs";
import { AmmoService } from "./ammo.mjs";
import { RestService } from "./rest.mjs";
import { HotbarService } from "./hotbar.mjs";
import { findAmmoItems, isAmmo, isRation, sumItemQuantities } from "./item-flags.mjs";
import { VerseService } from "./verses.mjs";
import { EncumbranceService } from "./encumbrance.mjs";
import { HungerService } from "./hunger.mjs";
import { ContainerService } from "./containers.mjs";
import { ManeuverService } from "./maneuvers.mjs";
import { setupBithirMod } from "./bithir-macros.mjs";

Hooks.once("init", () => {
  TenebreSettings.register();
  registerKeybindings();

  HungerService.registerStatusEffect();
  ManeuverService.registerStatusEffects();
  setupBithirMod();
});

Hooks.on("createItem", (item) => {
  if (!TenebreSettings.get("enableEncumbrance")) return;

  if (item.parent && item.parent.type === "player") {
    EncumbranceService.autoAssignSlots(item);
  }
});

Hooks.on("updateItem", (_item) => {
  if (!TenebreSettings.get("enableEncumbrance")) return;
});

Hooks.once("ready", async () => {
  if (game.system.id !== "symbaroum") {
    console.warn(`${MODULE_ID} | This module currently supports only the Symbaroum system.`);
    return;
  }

  // Ativa automação de combate do sistema se necessário
  if (game.user.isGM && !game.settings.get("symbaroum", "combatAutomation")) {
    console.log(`${MODULE_ID} | Automatically enabling Symbaroum Combat Automation.`);
    game.settings.set("symbaroum", "combatAutomation", true);
  }

  await EncumbranceService.loadWeightConfig(MODULE_ID);
  if (TenebreSettings.get("enableEncumbrance")) {
    EncumbranceService.startDynamicWeightFileWatcher();
  }

  patchWeaponRolls();
  registerSheetHooks();
  HotbarService.register();
  HungerService.registerHooks();
  ManeuverService.registerHooks();
  patchSymbaroumRollDialogs();
  patchSymbaroumActorUsePower();
  patchSymbaroumDerivedPenalties();
  ManeuverService.registerStatusEffects();

  // Aplica desvantagem de Fome para a rota simples de atributo.
  if (game.symbaroum?.api?.rollAttribute) {
    const originalRollAttribute = game.symbaroum.api.rollAttribute;
    game.symbaroum.api.rollAttribute = function(actor, actingAttributeName, targetActor, targetAttributeName, favour, modifier, armor, weapon, advantage, damModifier) {
      favour = ManeuverService.applyRollFavour(actor, actingAttributeName, favour, weapon);
      favour = HungerService.applyDisfavour(favour, actor);
      return originalRollAttribute.call(this, actor, actingAttributeName, targetActor, targetAttributeName, favour, modifier, armor, weapon, advantage, damModifier);
    };
  }

  game.tenebreResources = {
    rations: RationService,
    ammo: AmmoService,
    rest: RestService,
    hotbar: HotbarService,
    verses: VerseService,
    encumbrance: EncumbranceService,
    hunger: HungerService,
    containers: ContainerService,
    maneuvers: ManeuverService,
    bithir: game.bithirmod,

    inspectActorResources,
    diagnostics: {
      version: game.modules.get(MODULE_ID)?.version ?? null
    }
  };

  // Auto-atribuir slots de sobrecarga na inicialização
  if (TenebreSettings.get("enableEncumbrance")) {
    for (const actor of game.actors) {
      if (actor.type === "player" && actor.isOwner) {
        EncumbranceService.autoAssignAll(actor);
        EncumbranceService.applyDefensePenalty(actor);
      }
    }
  }

  console.log(`${MODULE_ID} | v${game.modules.get(MODULE_ID)?.version} ready.`);
});

function inspectActorResources(actorOrId) {
  const actor = typeof actorOrId === "string"
    ? game.actors.get(actorOrId) ?? game.actors.getName(actorOrId)
    : actorOrId;
  if (!actor) return null;

  const rations = RationService.getState(actor);
  const hits = AmmoService.getTrackedHits(actor);
  const usesAmmoResources = actor.type === "player";
  return {
    actor: actor.name,
    type: actor.type,
    rations: {
      quantity: rations.quantity,
      usesRemaining: rations.usesRemaining,
      usesPerUnit: rations.usesPerUnit
    },
    ammo: {
      quantity: usesAmmoResources ? sumItemQuantities(findAmmoItems(actor, "ammo")) : 0,
      hits
    },
    detectedItems: Array.from(actor.items.values())
      .filter((item) => isRation(item) || (usesAmmoResources && isAmmo(item)))
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: Number(item.system?.number ?? 0) || 0,
        isRation: isRation(item),
        isAmmo: isAmmo(item)
      }))
  };
}

function registerKeybindings() {
  game.keybindings.register(MODULE_ID, "openRestDialog", {
    name: "TENEBRE.Keybindings.OpenRestDialog",
    hint: "TENEBRE.Keybindings.OpenRestDialogHint",
    editable: [
      { key: "KeyR", modifiers: ["CONTROL", "SHIFT"] }
    ],
    onDown: () => {
      const actors = game.user.isGM
        ? canvas.tokens.controlled.map(t => t.actor).filter(a => a?.type === "player")
        : [game.user.character].filter(Boolean);

      if (!actors.length) {
        ui.notifications.warn(game.i18n.localize("TENEBRE.Rest.NoActorsSelectedKeybinding"));
        return;
      }

      for (const actor of actors) {
        game.tenebreResources.rest.openRestDialog(actor);
      }
    }
  });
}

let rollDialogsPatched = false;
let pendingDialogActorId = null;

function patchSymbaroumRollDialogs() {
  if (rollDialogsPatched || !globalThis.Dialog?.prototype?.render) return;

  const originalRender = Dialog.prototype.render;
  Dialog.prototype.render = function tenebreRenderDialog(...args) {
    const content = String(this.data?.content ?? this.content ?? "");
    if (content.includes("symbaroum dialog") && hasFavourRollOptions(content)) {
      const actorId = pendingDialogActorId ?? extractActorIdFromDialogContent(content);
      if (actorId) {
        this._tenebreHungerActorId = actorId;
      }
      wrapDialogRollButton(this);
    }

    return originalRender.apply(this, args);
  };

  rollDialogsPatched = true;
}

function hasFavourRollOptions(content) {
  return content.includes('name="favour"')
    || content.includes("name='favour'")
    || content.includes("name=favour")
    || content.includes("lblfavour");
}

function patchSymbaroumActorUsePower() {
  const ActorClass = CONFIG.Actor.documentClass;
  if (!ActorClass?.prototype?.usePower || ActorClass.prototype.usePower._tenebreWrapped) return;

  const originalUsePower = ActorClass.prototype.usePower;
  ActorClass.prototype.usePower = async function tenebreUsePower(...args) {
    const previousActorId = pendingDialogActorId;
    pendingDialogActorId = this.id;
    try {
      return await originalUsePower.apply(this, args);
    } finally {
      pendingDialogActorId = previousActorId;
    }
  };
  ActorClass.prototype.usePower._tenebreWrapped = true;
}

function patchSymbaroumDerivedPenalties() {
  const ActorClass = CONFIG.Actor.documentClass;
  if (!ActorClass?.prototype?.prepareDerivedData || ActorClass.prototype.prepareDerivedData._tenebreWrapped) return;

  const originalPrepareDerivedData = ActorClass.prototype.prepareDerivedData;
  ActorClass.prototype.prepareDerivedData = function tenebrePrepareDerivedData(...args) {
    const result = originalPrepareDerivedData.apply(this, args);
    if (TenebreSettings.get("enableEncumbrance") && this.type === "player") {
      EncumbranceService.applyDefensePenalty(this);
    }
    return result;
  };
  ActorClass.prototype.prepareDerivedData._tenebreWrapped = true;
}

function wrapDialogRollButton(dialog) {
  const rollButton = dialog.data?.buttons?.roll;
  if (!rollButton?.callback || rollButton.callback._tenebreWrapped) return;

  const originalCallback = rollButton.callback;
  rollButton.callback = async function tenebreRollDialogCallback(html, ...args) {
    applyStatusFavourToDialog(html, dialog);
    return originalCallback.call(this, html, ...args);
  };
  rollButton.callback._tenebreWrapped = true;
}

function extractActorIdFromDialogContent(content) {
  const match = content.match(/\bid=["']modifier-([^"']+)["']/);
  const dialogId = match?.[1];
  if (!dialogId) return null;

  const actors = Array.from(game.actors ?? []);
  return actors.find((actor) => dialogId.startsWith(actor.id))?.id ?? null;
}

function applyStatusFavourToDialog(html, dialog) {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  const favours = Array.from(root.querySelectorAll("input[name='favour']"));
  if (!favours.length) return;

  const actorId = dialog?._tenebreHungerActorId;
  const activeWeaponRoll = game.tenebreResources?.activeManeuverWeaponRoll;
  const actor = game.actors?.get?.(actorId) ?? activeWeaponRoll?.actor;
  const weapon = activeWeaponRoll?.actor === actor ? activeWeaponRoll.weapon : null;
  const attribute = getDialogActingAttribute(root, dialog);
  const currentFavour = Number(favours.find((input) => input.checked)?.value ?? 0) || 0;

  let nextFavour = currentFavour;
  if (actor) {
    nextFavour = ManeuverService.applyRollFavour(actor, attribute, nextFavour, weapon);
    nextFavour = HungerService.applyDisfavour(nextFavour, actor);
  }

  const targetFavour = getHungerFavourValue(actorId);
  if (targetFavour !== null) nextFavour = Number(targetFavour) || 0;

  for (const input of favours) {
    input.checked = Number(input.value) === nextFavour;
  }
}

function getDialogActingAttribute(root, dialog) {
  const selectors = [
    "select[name='actingAttribute']",
    "select[name='actingAttributeName']",
    "select[id^='actingAttribute-']",
    "input[name='actingAttribute']",
    "input[name='actingAttributeName']"
  ];

  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element?.value) return element.value;
  }

  const title = normalizeText(dialog?.data?.title ?? dialog?.title ?? "");
  if (title.includes("defesa") || title.includes("defense")) return "defense";

  const text = normalizeText(root.textContent ?? "");
  if (text.includes("teste de defesa") || text.includes("defense test")) return "defense";

  return "";
}

function getHungerFavourValue(actorId) {
  const actor = game.actors?.get?.(actorId);
  if (HungerService.hasHunger(actor)) return "-1";

  const hungryTarget = Array.from(game.user?.targets ?? []).find((token) => HungerService.hasHunger(token.actor));
  if (actor?.type === "monster" && hungryTarget) return "1";

  return null;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
