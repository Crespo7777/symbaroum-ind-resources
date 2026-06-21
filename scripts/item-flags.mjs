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
  if (Object.values(AMMO_TYPES).includes(type)) return type;
  const specialType = getSpecialAmmoType(item);
  if (specialType) return specialType;
  
  const name = normalize(item?.name);

  // Quiver / Aljava detection
  if (name.includes("aljava") || name.includes("quiver")) {
    const isBoltTerm = ["virote", "bolt", "besta", "crossbow", "quarrel"].some(t => name.includes(t));
    return isBoltTerm ? AMMO_TYPES.BOLT : AMMO_TYPES.ARROW;
  }

  const isBoltName = hasAlias(name, BOLT_ALIASES);
  const isArrowName = hasAlias(name, ARROW_ALIASES);
  if (isBoltName && !isArrowName) return AMMO_TYPES.BOLT;
  if (isArrowName && !isBoltName) return AMMO_TYPES.ARROW;
  return "";
}

export function getWeaponAmmoType(weapon) {
  const weaponType = getFlag(weapon, "weaponAmmoType", WEAPON_AMMO_TYPES.NONE);
  if (weaponType === WEAPON_AMMO_TYPES.BOW) return AMMO_TYPES.ARROW;
  if (weaponType === WEAPON_AMMO_TYPES.CROSSBOW) return AMMO_TYPES.BOLT;
  const name = normalize(weapon?.name);
  if (hasAlias(name, CROSSBOW_ALIASES)) return AMMO_TYPES.BOLT;
  if (hasAlias(name, BOW_ALIASES)) return AMMO_TYPES.ARROW;
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
  return name.includes("aljava") || name.includes("quiver");
}

export function getAmmoShots(item) {
  const qty = itemQuantity(item);
  if (isQuiver(item)) {
    const usesRemaining = item.getFlag(FLAG_SCOPE, "usesRemaining") ?? 12;
    return qty > 0 ? (qty - 1) * 12 + usesRemaining : 0;
  }
  return qty;
}

export function sumAmmoShots(items) {
  return items.reduce((total, item) => total + getAmmoShots(item), 0);
}

export function localizeAmmoType(ammoType) {
  if (ammoType === AMMO_TYPES.ARROW) return game.i18n.localize("TENEBRE.Ammo.Arrows");
  if (ammoType === AMMO_TYPES.BOLT) return game.i18n.localize("TENEBRE.Ammo.Bolts");
  return game.i18n.localize("TENEBRE.Ammo.Ammo");
}

function hasAlias(value, aliases) {
  const normalized = normalize(value);
  return aliases.some((alias) => normalized.includes(normalize(alias)));
}
