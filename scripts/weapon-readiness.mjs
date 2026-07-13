import { FLAG_SCOPE, MODULE_ID } from "./constants.mjs";
import { escapeHtml, promptDialog } from "./utils.mjs";

export const WEAPON_READINESS_FLAG = "weaponReadiness";
export const WEAPON_READY_STATE = "drawn";
export const WEAPON_HAND_LIMIT = 2;

const actorUpdates = new Map();

export const WeaponReadinessService = {
  registerHooks() {
    Hooks.on("preUpdateItem", clearReadinessWhenWeaponBecomesInactive);
  },

  isEnabled() {
    return game.settings.get(MODULE_ID, "enableWeaponReadiness");
  },

  isEligibleWeapon,
  isDrawn,

  getEligibleWeapons(actor) {
    return Array.from(actor?.items ?? []).filter(isEligibleWeapon);
  },

  getDrawnWeapons(actor) {
    return this.getEligibleWeapons(actor).filter(isDrawn);
  },

  async open(actor) {
    if (!this.isEnabled() || !canManageActor(actor)) return null;
    const weapons = this.getEligibleWeapons(actor);
    if (weapons.length === 0) {
      ui.notifications.info(game.i18n.localize("TENEBRE.WeaponReadiness.NoWeapons"));
      return null;
    }

    const options = weapons.map((weapon) => `
      <label class="tenebre-weapon-readiness-option">
        <input type="checkbox" name="drawnWeaponIds" value="${escapeHtml(weapon.id)}" ${isDrawn(weapon) ? "checked" : ""}>
        <span class="tenebre-weapon-readiness-check" aria-hidden="true"></span>
        <img src="${escapeHtml(weapon.img)}" alt="">
        <span>${escapeHtml(weapon.name)}</span>
      </label>
    `).join("");

    const content = `
      <div class="tenebre-weapon-readiness-list">${options}</div>
      <label class="tenebre-weapon-readiness-sheathe-all">
        <input type="checkbox" name="sheatheAll">
        <span class="tenebre-weapon-readiness-check" aria-hidden="true"></span>
        <span class="tenebre-weapon-readiness-sheathe-label">${escapeHtml(game.i18n.localize("TENEBRE.WeaponReadiness.SheatheAll"))}</span>
      </label>
    `;

    return promptDialog({
      title: game.i18n.localize("TENEBRE.WeaponReadiness.DialogTitle"),
      content,
      width: 260,
      contentClass: "tenebre-weapon-readiness-dialog",
      callback: async (element) => {
        const desiredIds = element.querySelector("input[name='sheatheAll']")?.checked
          ? []
          : Array.from(element.querySelectorAll("input[name='drawnWeaponIds']:checked"), (input) => input.value);
        return this.setDrawnWeapons(actor, desiredIds);
      }
    });
  },

  async setDrawn(weapon, drawn) {
    const actor = weapon?.parent;
    if (!isEligibleWeapon(weapon) || !canManageActor(actor)) return false;
    const desiredIds = new Set(this.getDrawnWeapons(actor).map((item) => item.id));
    if (drawn) desiredIds.add(weapon.id);
    else desiredIds.delete(weapon.id);
    return this.setDrawnWeapons(actor, desiredIds);
  },

  async setDrawnWeapons(actor, desiredIds = []) {
    if (!this.isEnabled() || !canManageActor(actor)) return false;
    const weapons = this.getEligibleWeapons(actor);
    const handUsage = getWeaponHandUsage(weapons, desiredIds);
    if (handUsage > WEAPON_HAND_LIMIT) {
      ui.notifications.warn(game.i18n.format("TENEBRE.WeaponReadiness.HandLimitExceeded", {
        used: handUsage,
        limit: WEAPON_HAND_LIMIT
      }));
      return false;
    }

    const actorKey = actor.uuid ?? actor.id;
    if (actorUpdates.has(actorKey)) return actorUpdates.get(actorKey);

    const operation = updateWeaponReadiness(actor, desiredIds)
      .finally(() => actorUpdates.delete(actorKey));
    actorUpdates.set(actorKey, operation);
    return operation;
  }
};

export function isEligibleWeapon(item) {
  if (item?.type !== "weapon") return false;
  const active = item.system?.state === "active" || item.system?.isActive === true;
  if (!active) return false;
  return String(item.system?.reference ?? "").toLowerCase() !== "unarmed";
}

export function isDrawn(item) {
  return item?.getFlag?.(FLAG_SCOPE, WEAPON_READINESS_FLAG) === WEAPON_READY_STATE
    || item?.flags?.[FLAG_SCOPE]?.[WEAPON_READINESS_FLAG] === WEAPON_READY_STATE;
}

export function canAttackWithWeapon(item) {
  if (item?.type !== "weapon") return true;
  if (String(item.system?.reference ?? "").toLowerCase() === "unarmed") return true;
  return isEligibleWeapon(item) && isDrawn(item);
}

/**
 * Return the number of hands represented by the system weapon mode.
 * A flexible shield represents a buckler strapped to the arm. Heavy and long
 * weapons remain two-handed because the system does not expose a one-handed
 * mode that also applies the required damage or quality reductions.
 */
export function getWeaponHandCost(item) {
  const reference = String(item?.system?.reference ?? "").toLowerCase();
  const qualities = item?.system?.qualities ?? {};
  if (reference === "unarmed") return 0;
  if (reference === "shield" && qualities.flexible) return 0;
  if (reference === "heavy") return 2;
  if (reference === "long") return 2;
  if (reference === "ranged") return 2;
  return 1;
}

export function getWeaponHandUsage(weapons, desiredIds = []) {
  const desired = new Set(desiredIds ?? []);
  return Array.from(weapons ?? [])
    .filter((weapon) => desired.has(weapon.id))
    .reduce((total, weapon) => total + getWeaponHandCost(weapon), 0);
}

export function resolveWeaponItem(actor, weapon) {
  if (weapon?.type === "weapon" && weapon?.parent === actor) return weapon;
  const id = weapon?.id ?? weapon?._id;
  if (!id) return null;
  return actor?.items?.get?.(id)
    ?? Array.from(actor?.items ?? []).find((item) => item?.id === id)
    ?? null;
}

export function buildWeaponReadinessPatches(weapons, desiredIds = []) {
  const desired = new Set(desiredIds);
  return weapons.flatMap((weapon) => {
    const nextState = desired.has(weapon.id) ? WEAPON_READY_STATE : "sheathed";
    const currentState = isDrawn(weapon) ? WEAPON_READY_STATE : "sheathed";
    if (nextState === currentState) return [];
    return [{
      _id: weapon.id,
      [`flags.${FLAG_SCOPE}.${WEAPON_READINESS_FLAG}`]: nextState
    }];
  });
}

async function updateWeaponReadiness(actor, desiredIds) {
  const weapons = WeaponReadinessService.getEligibleWeapons(actor);
  const allowedIds = new Set(weapons.map((weapon) => weapon.id));
  const desired = new Set(Array.from(desiredIds ?? []).filter((id) => allowedIds.has(id)));
  const previous = weapons.filter(isDrawn);
  const patches = buildWeaponReadinessPatches(weapons, desired);
  if (patches.length === 0) return false;

  await actor.updateEmbeddedDocuments("Item", patches);

  const next = weapons.filter((weapon) => desired.has(weapon.id));
  const drawn = next.filter((weapon) => !previous.some((entry) => entry.id === weapon.id));
  const sheathed = previous.filter((weapon) => !desired.has(weapon.id));
  await createReadinessChatMessage(actor, drawn, sheathed);
  Hooks.callAll(`${MODULE_ID}.weaponReadinessChanged`, { actor, drawn, sheathed, previous, current: next });
  return true;
}

async function createReadinessChatMessage(actor, drawn, sheathed) {
  const key = drawn.length > 0 && sheathed.length > 0
    ? "TENEBRE.WeaponReadiness.ChatSwapped"
    : drawn.length > 0
      ? "TENEBRE.WeaponReadiness.ChatDrawn"
      : "TENEBRE.WeaponReadiness.ChatSheathed";
  const text = game.i18n.format(key, {
    actor: actor.name,
    drawn: formatWeaponNames(drawn),
    sheathed: formatWeaponNames(sheathed),
    weapons: formatWeaponNames(drawn.length > 0 ? drawn : sheathed)
  });
  const image = drawn[0]?.img ?? sheathed[0]?.img ?? actor.img;
  const content = `
    <article class="tenebre-modern-chat tenebre-weapon-readiness-chat">
      <img src="${escapeHtml(image)}" alt="">
      <div>
        <strong>${escapeHtml(game.i18n.localize("TENEBRE.WeaponReadiness.ChatTitle"))}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    </article>
  `;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      [MODULE_ID]: {
        type: "weaponReadiness",
        actorUuid: actor.uuid,
        drawnWeaponIds: drawn.map((weapon) => weapon.id),
        sheathedWeaponIds: sheathed.map((weapon) => weapon.id)
      }
    }
  });
}

function formatWeaponNames(weapons) {
  const names = weapons.map((weapon) => weapon.name);
  if (names.length <= 1) return names[0] ?? "";
  return new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" }).format(names);
}

function canManageActor(actor) {
  if (!actor || (actor.type !== "player" && actor.type !== "character")) return false;
  if (actor.isOwner || game.user?.isGM) return true;
  ui.notifications.warn(game.i18n.localize("TENEBRE.WeaponReadiness.NoPermission"));
  return false;
}

function clearReadinessWhenWeaponBecomesInactive(item, changes) {
  if (item?.type !== "weapon" || !isDrawn(item)) return;
  const nextState = foundry.utils.getProperty(changes, "system.state");
  if (nextState === undefined || nextState === "active") return;
  foundry.utils.setProperty(changes, `flags.${FLAG_SCOPE}.${WEAPON_READINESS_FLAG}`, "sheathed");
}
