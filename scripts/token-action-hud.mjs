import { MODULE_ID } from "./constants.mjs";
import { ManeuverService } from "./maneuvers.mjs";
import { SocketService } from "./sockets.mjs";

const TAH_CORE_ID = "token-action-hud-core";
const TAH_SYMBAROUM_ID = "token-action-hud-symbaroum";
const MANEUVERS_GROUP_ID = "tenebre-maneuvers";
const MANEUVERS_GROUP_NEST_ID = "tenebre-maneuvers_tenebre-maneuvers";

let registered = false;

export class TokenActionHudIntegration {
  static register() {
    if (registered) return;
    registered = true;

    Hooks.on("tokenActionHudCoreRegisterDefaults", (defaults) => {
      try {
        TokenActionHudIntegration.extendDefaults(defaults);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to extend Token Action HUD defaults.`, error);
      }
    });

    Hooks.on("tokenActionHudCoreAddActionHandler", (handler) => {
      try {
        TokenActionHudIntegration.extendActionHandler(handler);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to extend Token Action HUD action handler.`, error);
      }
    });
  }

  static extendDefaults(defaults) {
    if (!isTokenActionHudAvailable()) return;
    if (!defaults?.layout || !defaults?.groups) return;

    const label = game.i18n.localize("TENEBRE.Maneuvers.Title") || "Manobras";
    const group = {
      id: MANEUVERS_GROUP_ID,
      name: label,
      listName: `Group: ${label}`,
      type: "system"
    };

    if (!defaults.groups.some((existing) => existing.id === MANEUVERS_GROUP_ID && existing.type === "system")) {
      defaults.groups.push(group);
    }

    if (!defaults.layout.some((existing) => existing.id === MANEUVERS_GROUP_ID)) {
      defaults.layout.splice(2, 0, {
        nestId: MANEUVERS_GROUP_ID,
        id: MANEUVERS_GROUP_ID,
        name: label,
        groups: [
          {
            ...group,
            nestId: MANEUVERS_GROUP_NEST_ID
          }
        ]
      });
    }
  }

  static extendActionHandler(handler) {
    if (!isTokenActionHudAvailable()) return;
    if (!handler?.buildSystemActions || handler.buildSystemActions._tenebreWrapped) return;

    const originalBuildSystemActions = handler.buildSystemActions;
    handler.buildSystemActions = async function tenebreBuildSystemActions(...args) {
      const result = await originalBuildSystemActions.apply(this, args);
      await addManeuverActions(this);
      return result;
    };

    handler.buildSystemActions._tenebreWrapped = true;
  }

  static getGroupId() {
    return MANEUVERS_GROUP_ID;
  }

  static buildActions(actor) {
    if (actor?.type !== "player") return [];

    const actionTypeName = game.i18n.localize("TENEBRE.Maneuvers.Title") || "Manobras";
    const actions = ManeuverService.list().map((maneuver) => {
      const name = game.i18n.localize(maneuver.labelKey);
      const tooltip = maneuver.noteKeys
        ?.map((key) => game.i18n.localize(key))
        .filter(Boolean)
        .join("<br>") ?? "";

      return {
        id: `tenebre-maneuver-${maneuver.id}`,
        name,
        listName: `${actionTypeName}: ${name}`,
        icon1: `<i class="fas ${maneuver.icon}"></i>`,
        tooltip: tooltip ? { content: tooltip } : null,
        onClick: async () => ManeuverService.execute(actor, maneuver.id)
      };
    });

    if (hasActorEffects(actor)) {
      actions.push({
        id: "tenebre-clear-effects",
        name: game.i18n.localize("TENEBRE.Maneuvers.ClearEffects"),
        listName: `${actionTypeName}: ${game.i18n.localize("TENEBRE.Maneuvers.ClearEffects")}`,
        icon1: '<i class="fas fa-eraser"></i>',
        onClick: async () => {
          const count = await clearActorEffects(actor);
          ui.notifications.info(game.i18n.format("TENEBRE.Maneuvers.ClearEffectsDone", { count }));
        }
      });
    }

    return actions;
  }
}

async function addManeuverActions(handler) {
  const actor = getHandlerActor(handler);
  if (actor?.type !== "player") return;

  const actions = TokenActionHudIntegration.buildActions(actor);
  if (!actions.length) return;

  handler.addActions(actions, { id: MANEUVERS_GROUP_ID, type: "system" });
}

function getHandlerActor(handler) {
  if (handler?.actor) return handler.actor;

  const controlledTokens = canvas?.tokens?.controlled ?? [];
  if (controlledTokens.length === 1) return controlledTokens[0]?.actor ?? null;

  return null;
}

function hasActorEffects(actor) {
  return Array.from(actor?.effects ?? []).length > 0;
}

async function clearActorEffects(actor) {
  const effects = Array.from(actor?.effects ?? []).filter((effect) => effect?.id);
  if (!actor || !effects.length) return 0;

  await ManeuverService.prepareEffectsForRemoval(actor, effects);
  await SocketService.deleteEmbeddedDocuments(actor, "ActiveEffect", effects.map((effect) => effect.id), { render: true });
  return effects.length;
}

function isTokenActionHudAvailable() {
  return game.modules.get(TAH_CORE_ID)?.active && game.modules.get(TAH_SYMBAROUM_ID)?.active;
}
