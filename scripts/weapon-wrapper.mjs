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

      game.tenebreResources.activeWeaponRoll = null;
      game.tenebreResources.activeWeaponModifiers = null;

      if (chosenAmmo) {
        await AmmoService.consumeAmmo(this, chosenAmmo, weapon, ammoType);

        // Rastreia o acerto se o ataque for bem-sucedido
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
