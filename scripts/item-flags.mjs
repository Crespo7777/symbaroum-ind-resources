import { AMMO_TYPES, FLAG_SCOPE, WEAPON_AMMO_TYPES } from "./constants.mjs";
import { getSpecialAmmoType } from "./special-ammo.mjs";
import { normalize } from "./utils.mjs";

const RATION_ALIASES = ["pao de viagem", "waybread", "travel bread", "racao de viagem", "racao", "ration", "rations"];
const ARROW_ALIASES = [
  "flecha",
  "flechas",
  "arrow",
  "arrows",
  "precision arrow",
  "flaming arrow",
  "grappling arrow",
  "ensnaring arrow",
  "whistling arrow"
];
const BOLT_ALIASES = [
  "virote",
  "virotes",
  "bolt",
  "bolts",
  "quarrel",
  "quarrels",
  "stun bolt",
  "stunning bolt"
];
const CROSSBOW_ALIASES = ["crossbow", "besta", "arbalest", "arbalesta", "repeating crossbow", "besta de repeticao"];
const BOW_ALIASES = ["longbow", "shortbow", "bow", "arco longo", "arco curto", "arco"];

export function getFlag(doc, key, fallback = undefined) {
  return doc?.getFlag?.(FLAG_SCOPE, key) ?? fallback;
}

export function isRation(item) {
  if (!item || item.type !== "equipment") return false;
  if (getFlag(item, "isRation", false)) return true;
  return hasAlias(item.name, RATION_ALIASES);
}

export function isAmmo(item) {
  if (item?.type !== "equipment") return false;
  if (getFlag(item, "isAmmo", false)) return true;
  return Boolean(getAmmoType(item));
}

export function getAmmoType(item) {
  const type = getFlag(item, "ammoType", "");
  if (type === "ammo") return "ammo";
  if (getFlag(item, "isAmmo", false)) return "ammo";
  const specialType = getSpecialAmmoType(item);
  if (specialType) return "ammo";
  
  const name = normalize(item?.name);

  // Quiver / Aljava detection
  if (name.includes("aljava") || name.includes("quiver")) {
    return "ammo";
  }

  const isBoltName = hasAlias(name, BOLT_ALIASES);
  const isArrowName = hasAlias(name, ARROW_ALIASES);
  if (isBoltName || isArrowName || name.includes("municao") || name.includes("ammunition") || name.includes("projectile") || name.includes("projetil")) {
    return "ammo";
  }
  return "";
}

export function getWeaponAmmoType(weapon) {
  const weaponType = getFlag(weapon, "weaponAmmoType", WEAPON_AMMO_TYPES.NONE);
  if (weaponType === WEAPON_AMMO_TYPES.BOW || weaponType === WEAPON_AMMO_TYPES.CROSSBOW) return "ammo";
  const name = normalize(weapon?.name);
  if (hasAlias(name, CROSSBOW_ALIASES) || hasAlias(name, BOW_ALIASES)) return "ammo";
  return "";
}

export function itemQuantity(item) {
  return Number(item?.system?.number ?? 0) || 0;
}

export async function changeItemQuantity(item, delta) {
  const current = itemQuantity(item);
  const next = Math.max(0, current + delta);
  return item.update({ "system.number": next });
}

export function actorItems(actor) {
  return Array.from(actor?.items?.values?.() ?? []);
}

export function findRationItems(actor) {
  return actorItems(actor).filter(isRation);
}

export function findAmmoItems(actor, ammoType) {
  return actorItems(actor).filter((item) => isAmmo(item) && getAmmoType(item) === ammoType && itemQuantity(item) > 0);
}

export function sumItemQuantities(items) {
  return items.reduce((total, item) => total + itemQuantity(item), 0);
}

export function isQuiver(item) {
  if (!item || item.type !== "equipment") return false;
  const name = item.name?.toLowerCase() || "";
  return name.includes("aljava") || name.includes("quiver") || name.includes("estojo") || name.includes("case");
}

export function getQuiverLoadedAmmo(quiverItem) {
  if (!quiverItem) return [];
  let loadedAmmo = quiverItem.getFlag(FLAG_SCOPE, "loadedAmmo");
  if (!loadedAmmo || !loadedAmmo.length) {
    const legacyUses = quiverItem.getFlag(FLAG_SCOPE, "usesRemaining");
    if (legacyUses !== undefined && legacyUses !== null) {
      loadedAmmo = [{
        name: "Flechas/Virotes - Regulares",
        quantity: legacyUses,
        img: "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
        id: "legacy"
      }];
    } else {
      loadedAmmo = [];
    }
  }
  return loadedAmmo;
}

export function getQuiverLoadedTotal(quiverItem) {
  const loadedAmmo = getQuiverLoadedAmmo(quiverItem);
  return loadedAmmo.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
}

export function getAmmoShots(item) {
  const qty = itemQuantity(item);
  if (isQuiver(item)) {
    const loaded = getQuiverLoadedTotal(item);
    return qty > 0 ? (qty - 1) * 12 + loaded : 0;
  }
  return qty;
}

export function sumAmmoShots(items) {
  return items.reduce((total, item) => total + getAmmoShots(item), 0);
}

export function localizeAmmoType(ammoType) {
  return game.i18n.localize("TENEBRE.Ammo.Ammo");
}

function hasAlias(value, aliases) {
  const normalized = normalize(value);
  return aliases.some((alias) => normalized.includes(normalize(alias)));
}
