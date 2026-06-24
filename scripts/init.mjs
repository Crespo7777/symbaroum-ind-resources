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

Hooks.once("init", () => {
  TenebreSettings.register();
  registerKeybindings();

  // Status de Fome
  CONFIG.statusEffects.push({
    id: "hunger",
    name: "Fome",
    icon: "icons/consumables/food/bowl-stew-brown.webp",
    statuses: ["hunger", "fome"]
  });
});

Hooks.on("createItem", (item) => {
  if (TenebreSettings.get("enableEncumbrance") && item.parent && item.parent.type === "player") {
    EncumbranceService.autoAssignSlots(item);
  }
});

Hooks.once("ready", () => {
  if (game.system.id !== "symbaroum") {
    console.warn(`${MODULE_ID} | This module currently supports only the Symbaroum system.`);
    return;
  }

  // Ativa automação de combate do sistema se necessário
  if (game.user.isGM && !game.settings.get("symbaroum", "combatAutomation")) {
    console.log(`${MODULE_ID} | Automatically enabling Symbaroum Combat Automation.`);
    game.settings.set("symbaroum", "combatAutomation", true);
  }

  patchWeaponRolls();
  registerSheetHooks();
  HotbarService.register();

  // Aplica desvantagem de Fome e penalidade de Defesa por Sobrecarga
  if (game.symbaroum?.api?.rollAttribute) {
    const originalRollAttribute = game.symbaroum.api.rollAttribute;
    game.symbaroum.api.rollAttribute = function(actor, actingAttributeName, targetActor, targetAttributeName, favour, modifier, armor, weapon, advantage, damModifier) {
      // Regra de Fome
      const hasHunger = actor?.effects?.some(e => e.statuses?.has?.("hunger") || e.statuses?.has?.("fome") || e.name === "Fome" || e.name === "Hunger");
      if (hasHunger) {
        favour = -1;
      }

      // Regra de Sobrecarga (Encumbrance) - Penalidade na Defesa
      if (TenebreSettings.get("enableEncumbrance") && actor?.type === "player") {
        const attrName = String(actingAttributeName).toLowerCase();
        if (attrName === "defense" || attrName === "defesa") {
          const load = EncumbranceService.calculateLoad(actor);
          if (load.defensePenalty > 0) {
            modifier = (Number(modifier) || 0) - load.defensePenalty;
          }
        }
      }

      return originalRollAttribute.call(this, actor, actingAttributeName, targetActor, targetAttributeName, favour, modifier, armor, weapon, advantage, damModifier);
    };
  }

  game.tenebreResources = {
    rations: RationService,
    ammo: AmmoService,
    rest: RestService,
    verses: VerseService,
    encumbrance: EncumbranceService,

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
  return {
    actor: actor.name,
    type: actor.type,
    rations: {
      quantity: rations.quantity,
      usesRemaining: rations.usesRemaining,
      usesPerUnit: rations.usesPerUnit
    },
    ammo: {
      quantity: sumItemQuantities(findAmmoItems(actor, "ammo")),
      hits
    },
    detectedItems: Array.from(actor.items.values())
      .filter((item) => isRation(item) || isAmmo(item))
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