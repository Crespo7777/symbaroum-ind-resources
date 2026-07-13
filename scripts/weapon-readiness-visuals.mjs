import { FLAG_SCOPE, MODULE_ID } from "./constants.mjs";
import { COMPAT_MODULES, CompatibilityService } from "./compatibility.mjs";
import { isDrawn, isEligibleWeapon } from "./weapon-readiness.mjs";

export const WEAPON_READINESS_INDICATOR_FLAG = "weaponReadinessIndicator";
export const WEAPON_READINESS_STATUS_ID = `${MODULE_ID}.weapon-readiness`;

const DRAW_ANIMATION = "jb2a.impact.006.yellow";
const SHEATHE_ANIMATION = "jb2a.impact.003.blue";
const indicatorSyncs = new Map();

export const WeaponReadinessVisualService = {
  registerHooks() {
    Hooks.on("updateItem", (item) => {
      if (item?.type === "weapon") queueIndicatorSync(item.parent);
    });
    Hooks.on("deleteItem", (item) => {
      if (item?.type === "weapon") queueIndicatorSync(item.parent);
    });
    Hooks.on(`${MODULE_ID}.weaponReadinessChanged`, ({ actor, drawn, sheathed }) => {
      void playReadinessAnimation(actor, drawn, sheathed);
    });
    Hooks.on(`${MODULE_ID}.settingsChanged`, (key) => {
      if (key === "enableWeaponReadiness" || key === "showWeaponReadinessTokenIndicator") {
        this.refreshAllIndicators();
      }
    });
    Hooks.on("canvasReady", () => this.refreshAllIndicators());
  },

  refreshAllIndicators() {
    for (const actor of getRelevantActors()) queueIndicatorSync(actor);
  },

  async syncActorIndicator(actor) {
    if (!isIndicatorExecutor(actor)) return false;
    const actorKey = actor.uuid ?? actor.id;
    if (indicatorSyncs.has(actorKey)) return indicatorSyncs.get(actorKey);

    const operation = syncActorIndicator(actor)
      .finally(() => indicatorSyncs.delete(actorKey));
    indicatorSyncs.set(actorKey, operation);
    return operation;
  }
};

export function isWeaponReadinessIndicatorEffect(effect) {
  return effect?.getFlag?.(FLAG_SCOPE, WEAPON_READINESS_INDICATOR_FLAG) === true
    || effect?.flags?.[FLAG_SCOPE]?.[WEAPON_READINESS_INDICATOR_FLAG] === true;
}

async function syncActorIndicator(actor) {
  const existing = Array.from(actor.effects ?? []).filter(isWeaponReadinessIndicatorEffect);
  const enabled = game.settings.get(MODULE_ID, "enableWeaponReadiness")
    && game.settings.get(MODULE_ID, "showWeaponReadinessTokenIndicator");
  const drawn = enabled ? Array.from(actor.items ?? []).filter((item) => isEligibleWeapon(item) && isDrawn(item)) : [];

  if (drawn.length === 0) {
    if (existing.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", existing.map((effect) => effect.id));
    }
    return existing.length > 0;
  }

  const names = formatWeaponNames(drawn);
  const effectData = CompatibilityService.buildVisualActiveEffectData({
    name: game.i18n.format("TENEBRE.WeaponReadiness.IndicatorName", { weapons: names }),
    img: drawn[0].img,
    statuses: [WEAPON_READINESS_STATUS_ID],
    flags: {
      [FLAG_SCOPE]: {
        [WEAPON_READINESS_INDICATOR_FLAG]: true,
        weaponIds: drawn.map((weapon) => weapon.id)
      }
    }
  });

  const [primary, ...duplicates] = existing;
  if (duplicates.length > 0) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", duplicates.map((effect) => effect.id));
  }
  if (!primary) {
    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    return true;
  }

  const patch = { _id: primary.id, ...effectData };
  if (indicatorMatches(primary, effectData)) return duplicates.length > 0;
  await actor.updateEmbeddedDocuments("ActiveEffect", [patch]);
  return true;
}

function indicatorMatches(effect, data) {
  const currentIds = effect.flags?.[FLAG_SCOPE]?.weaponIds ?? [];
  const nextIds = data.flags?.[FLAG_SCOPE]?.weaponIds ?? [];
  const currentImage = effect.img ?? effect.icon;
  return effect.name === data.name
    && currentImage === data.img
    && currentIds.length === nextIds.length
    && currentIds.every((id, index) => id === nextIds[index]);
}

function queueIndicatorSync(actor) {
  if (!actor || (actor.type !== "player" && actor.type !== "character")) return;
  void WeaponReadinessVisualService.syncActorIndicator(actor)
    .catch((error) => console.warn(`${MODULE_ID} | Could not synchronize the drawn-weapon token indicator.`, error));
}

function getRelevantActors() {
  const actors = new Map();
  for (const actor of game.actors ?? []) actors.set(actor.uuid ?? actor.id, actor);
  for (const token of canvas?.tokens?.placeables ?? []) {
    if (token.actor) actors.set(token.actor.uuid ?? token.actor.id, token.actor);
  }
  return actors.values();
}

function isIndicatorExecutor(actor) {
  if (!actor || !game.user?.active) return false;
  const users = Array.from(game.users ?? []).filter((user) => user.active);
  const activeGms = users.filter((user) => user.isGM).sort(compareUserIds);
  if (activeGms.length > 0) return activeGms[0].id === game.user.id;

  const owners = users
    .filter((user) => actor.testUserPermission?.(user, "OWNER"))
    .sort(compareUserIds);
  return owners[0]?.id === game.user.id;
}

function compareUserIds(left, right) {
  return String(left.id).localeCompare(String(right.id));
}

async function playReadinessAnimation(actor, drawn, sheathed) {
  if (!game.settings.get(MODULE_ID, "enableWeaponReadinessAnimation")) return false;
  if (!canvas?.ready || !CompatibilityService.isModuleActive(COMPAT_MODULES.sequencer)) return false;
  if (typeof globalThis.Sequence !== "function" || !globalThis.Sequencer?.Database?.entryExists) return false;

  const token = getActorToken(actor);
  if (!token) return false;
  const animation = drawn?.length > 0 ? DRAW_ANIMATION : sheathed?.length > 0 ? SHEATHE_ANIMATION : null;
  if (!animation || !globalThis.Sequencer.Database.entryExists(animation)) return false;

  try {
    await new globalThis.Sequence({ inModuleName: MODULE_ID, softFail: true })
      .effect(animation)
      .atLocation(token)
      .scaleToObject(1.05)
      .fadeIn(100)
      .fadeOut(200)
      .play();
    return true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not play the weapon-readiness animation.`, error);
    return false;
  }
}

function getActorToken(actor) {
  const tokens = actor?.getActiveTokens?.(true, true) ?? [];
  return tokens.find((token) => token.document?.parent?.id === canvas.scene?.id) ?? tokens[0] ?? null;
}

function formatWeaponNames(weapons) {
  const names = weapons.map((weapon) => weapon.name);
  if (names.length <= 1) return names[0] ?? "";
  return new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" }).format(names);
}
