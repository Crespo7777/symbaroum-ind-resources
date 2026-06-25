import { AmmoService } from "./ammo.mjs";
import { getWeaponAmmoType, findLoadedQuiverItems, localizeAmmoType, sumLoadedQuiverShots } from "./item-flags.mjs";
import { TenebreSettings } from "./settings.mjs";

let patched = false;

export function patchWeaponRolls() {
  if (patched || game.system.id !== "symbaroum") return;
  const ActorClass = CONFIG.Actor.documentClass;
  if (!ActorClass?.prototype?.rollWeapon) return;

  const originalRollWeapon = ActorClass.prototype.rollWeapon;
  ActorClass.prototype.rollWeapon = async function tenebreRollWeapon(weapon, ...args) {
    // Reset status anterior de rolagem se houver
    if (game.tenebreResources?.activeWeaponRoll) {
      console.warn("Tenebre Resources | Clearing active roll state left over from a previous hung/incomplete roll.");
      game.tenebreResources.activeWeaponRoll = null;
      game.tenebreResources.activeWeaponModifiers = null;
    }

    const ammoType = getWeaponAmmoType(weapon);
    if (!ammoType || !TenebreSettings.get("enableAmmoConsumption")) {
      return originalRollWeapon.call(this, weapon, ...args);
    }

    // Exige seleção de exatamente 1 alvo se a automação de combate estiver ativa
    if (game.settings.get("symbaroum", "combatAutomation")) {
      const targets = Array.from(game.user.targets);
      if (targets.length !== 1) {
        ui.notifications.warn(game.i18n.localize("ABILITY_ERROR.TARGET"));
        return undefined;
      }
    }

    // Verifica se possui munição
    const ammoItems = findLoadedQuiverItems(this, ammoType);
    if (sumLoadedQuiverShots(ammoItems) <= 0) {
      ui.notifications.warn(game.i18n.format("TENEBRE.Ammo.NoCompatibleAmmo", { type: localizeAmmoType(ammoType) }));
      return undefined;
    }

    const rollState = {
      actor: this,
      weapon: weapon,
      ammoType: ammoType
    };
    game.tenebreResources.activeWeaponRoll = rollState;

    try {
      const result = await originalRollWeapon.call(this, weapon, ...args);
      const chosenAmmo = rollState.chosenAmmo;

      if (chosenAmmo) {
        if (!rollState.consumed) {
          rollState.consumed = true;
          await AmmoService.consumeAmmo(this, chosenAmmo, weapon, ammoType);
        }

        if (!rollState.hitRecorded && isSuccessfulWeaponResult(result)) {
          rollState.hitRecorded = true;
          await AmmoService.recordHit(this, chosenAmmo);
        }
      }

      return result;
    } catch (err) {
      if (err === "Cancelled") {
        return undefined;
      }
      throw err;
    } finally {
      setTimeout(() => {
        if (game.tenebreResources?.activeWeaponRoll?.actor === this) {
          game.tenebreResources.activeWeaponRoll = null;
          game.tenebreResources.activeWeaponModifiers = null;
        }
      }, 60000);
    }
  };

  patched = true;
}

function isSuccessfulWeaponResult(result) {
  if (!result) return false;
  if (result.hasSucceed === true || result.hasDamage === true) return true;
  if (Array.isArray(result.rollData)) {
    return result.rollData.some((roll) => roll?.trueActorSucceeded === true || roll?.hasDamage === true);
  }
  return false;
}
