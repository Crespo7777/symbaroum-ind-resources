import { AmmoService } from "./ammo.mjs";
import { getWeaponAmmoType, findAmmoItems, localizeAmmoType, sumAmmoShots } from "./item-flags.mjs";
import { TenebreSettings } from "./settings.mjs";

let patched = false;

export function patchWeaponRolls() {
  if (patched || game.system.id !== "symbaroum") return;
  const ActorClass = CONFIG.Actor.documentClass;
  if (!ActorClass?.prototype?.rollWeapon) return;

  const originalRollWeapon = ActorClass.prototype.rollWeapon;
  ActorClass.prototype.rollWeapon = async function tenebreRollWeapon(weapon, ...args) {
    // Safety cleanup of any previously hung roll state
    if (game.tenebreResources?.activeWeaponRoll) {
      console.warn("Tenebre Resources | Clearing active roll state left over from a previous hung/incomplete roll.");
      game.tenebreResources.activeWeaponRoll = null;
      game.tenebreResources.activeWeaponModifiers = null;
    }

    const ammoType = getWeaponAmmoType(weapon);
    if (!ammoType || !TenebreSettings.get("enableAmmoConsumption")) {
      return originalRollWeapon.call(this, weapon, ...args);
    }

    // Check target selection if combatAutomation is enabled (preventing ammo loss if it aborts)
    if (game.settings.get("symbaroum", "combatAutomation")) {
      try {
        const targets = Array.from(game.user.targets);
        if (targets.length === 0 || targets.length > 1) {
          throw game.i18n.localize("ABILITY_ERROR.TARGET");
        }
      } catch (error) {
        ui.notifications.error(error);
        return undefined;
      }
    }

    // Verify there is compatible ammo first, otherwise warn and abort
    const ammoItems = findAmmoItems(this, ammoType);
    if (sumAmmoShots(ammoItems) <= 0) {
      ui.notifications.warn(game.i18n.format("TENEBRE.Ammo.NoCompatibleAmmo", { type: localizeAmmoType(ammoType) }));
      return undefined;
    }

    // Initialize the active weapon roll state
    game.tenebreResources.activeWeaponRoll = {
      actor: this,
      weapon: weapon,
      ammoType: ammoType,
      selectedAmmo: null
    };

    let result;
    try {
      result = await originalRollWeapon.call(this, weapon, ...args);
    } catch (err) {
      if (err === "Cancelled") {
        return undefined;
      }
      throw err;
    } finally {
      const chosenAmmo = game.tenebreResources.activeWeaponRoll?.selectedAmmo;

      // Clean up the active roll variables
      game.tenebreResources.activeWeaponRoll = null;
      game.tenebreResources.activeWeaponModifiers = null;

      // If ammo was chosen, consume it
      if (chosenAmmo) {
        await AmmoService.consumeAmmo(this, chosenAmmo, weapon, ammoType);

        // Record hit if attack hit target
        const hasHit = result && (
          result.hasSucceed === true ||
          result.hasDamage === true ||
          (result.rollData && result.rollData.some(r => r.trueActorSucceeded))
        );
        if (hasHit) {
          await AmmoService.recordHit(this, chosenAmmo);
        }
      }
    }

    return result;
  };

  patched = true;
}

