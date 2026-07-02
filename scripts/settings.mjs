import { DEFAULTS, MODULE_ID } from "./constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TenebreSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "symbaroum-ind-resources-settings",
    tag: "form",
    form: {
      handler: TenebreSettingsForm.#onSubmit,
      closeOnSubmit: true
    },
    window: {
      title: "TENEBRE.Settings.MenuTitle",
      contentClasses: ["standard-form"]
    },
    position: {
      width: 520,
      height: "auto"
    }
  };

  static PARTS = {
    form: {
      template: "modules/symbaroum-ind-resources/templates/settings.hbs"
    }
  };

  async _prepareContext(_options) {
    const settings = TenebreSettings.export();
    return {
      settings,
      movementUnitMetersSelected: settings.movementUnitSystem === "meters",
      movementUnitFeetSelected: settings.movementUnitSystem === "feet",
      isGM: game.user.isGM
    };
  }

  static async #onSubmit(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    const booleans = [
      "enableRations",
      "enableAmmoConsumption",
      "enableHitTracking",
      "enableAmmoRecovery",
      "showAmmoRecoveryHud",
      "showQuiverHud",
      "showSpecialAmmoInChat",
      "enableHunger",
      "enableRestHealing",
      "enableEncumbrance",
      "enableContainers",
      "enableMovementRuler",
      "enableManeuvers",
      "enableChatItemUse",
      "enableRestButton",
      "enableClearEffectsButton",
      "enableTokenActionHudIntegration",
      "enableBithirUtilities",
      "enableGenerateShadow",
      "hideShadowLabel"
    ];

    const numbers = [
      "rationUses",
      "restHealing",
      "movementBaseMeters",
      "movementBaseFeet"
    ];

    const strings = [
      "movementUnitSystem"
    ];

    for (const key of booleans) {
      data[key] = Boolean(data[key]);
    }

    for (const key of numbers) {
      if (key in data) {
        data[key] = Number(data[key]);
      }
    }

    for (const key of strings) {
      if (key in data) {
        data[key] = String(data[key] ?? "");
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (!game.settings.settings.has(`${MODULE_ID}.${key}`)) continue;
      await game.settings.set(MODULE_ID, key, value);
    }
  }
}


export class TenebreSettings {
  static register() {
    game.settings.registerMenu(MODULE_ID, "settingsMenu", {
      name: "TENEBRE.Settings.MenuName",
      label: "TENEBRE.Settings.MenuLabel",
      hint: "TENEBRE.Settings.MenuHint",
      icon: "fas fa-campground",
      type: TenebreSettingsForm,
      restricted: true
    });



    register("enableRations", Boolean, true, "TENEBRE.Settings.EnableRations", "TENEBRE.Settings.EnableRationsHint");
    register("rationUses", Number, DEFAULTS.rationUses, "TENEBRE.Settings.RationUses", "TENEBRE.Settings.RationUsesHint");
    register("enableAmmoConsumption", Boolean, true, "TENEBRE.Settings.EnableAmmoConsumption", "TENEBRE.Settings.EnableAmmoConsumptionHint");
    register("enableHitTracking", Boolean, true, "TENEBRE.Settings.EnableHitTracking", "TENEBRE.Settings.EnableHitTrackingHint");
    register("enableAmmoRecovery", Boolean, true, "TENEBRE.Settings.EnableAmmoRecovery", "TENEBRE.Settings.EnableAmmoRecoveryHint");
    register("showAmmoRecoveryHud", Boolean, true, "TENEBRE.Settings.ShowAmmoRecoveryHud", "TENEBRE.Settings.ShowAmmoRecoveryHudHint");
    register("showQuiverHud", Boolean, true, "TENEBRE.Settings.ShowQuiverHud", "TENEBRE.Settings.ShowQuiverHudHint");
    register("showSpecialAmmoInChat", Boolean, true, "TENEBRE.Settings.ShowSpecialAmmoInChat", "TENEBRE.Settings.ShowSpecialAmmoInChatHint");
    register("enableHunger", Boolean, true, "TENEBRE.Settings.EnableHunger", "TENEBRE.Settings.EnableHungerHint");
    register("enableRestHealing", Boolean, true, "TENEBRE.Settings.EnableRestHealing", "TENEBRE.Settings.EnableRestHealingHint");
    register("restHealing", Number, DEFAULTS.restHealing, "TENEBRE.Settings.RestHealing", "TENEBRE.Settings.RestHealingHint");
    register("enableRestButton", Boolean, true, "TENEBRE.Settings.EnableRestButton", "TENEBRE.Settings.EnableRestButtonHint");

    register("enableEncumbrance", Boolean, true, "TENEBRE.Settings.EnableEncumbrance", "TENEBRE.Settings.EnableEncumbranceHint");
    register("enableContainers", Boolean, true, "TENEBRE.Settings.EnableContainers", "TENEBRE.Settings.EnableContainersHint");
    register("enableMovementRuler", Boolean, true, "TENEBRE.Settings.EnableMovementRuler", "TENEBRE.Settings.EnableMovementRulerHint");
    register("movementUnitSystem", String, DEFAULTS.movementUnitSystem, "TENEBRE.Settings.MovementUnitSystem", "TENEBRE.Settings.MovementUnitSystemHint", {
      choices: {
        meters: "TENEBRE.Settings.MovementUnitMeters",
        feet: "TENEBRE.Settings.MovementUnitFeet"
      }
    });
    register("movementBaseMeters", Number, DEFAULTS.movementBaseMeters, "TENEBRE.Settings.MovementBaseMeters", "TENEBRE.Settings.MovementBaseMetersHint");
    register("movementBaseFeet", Number, DEFAULTS.movementBaseFeet, "TENEBRE.Settings.MovementBaseFeet", "TENEBRE.Settings.MovementBaseFeetHint");

    register("enableManeuvers", Boolean, true, "TENEBRE.Settings.EnableManeuvers", "TENEBRE.Settings.EnableManeuversHint");
    register("enableChatItemUse", Boolean, true, "TENEBRE.Settings.EnableChatItemUse", "TENEBRE.Settings.EnableChatItemUseHint");
    register("enableClearEffectsButton", Boolean, true, "TENEBRE.Settings.EnableClearEffectsButton", "TENEBRE.Settings.EnableClearEffectsButtonHint");
    register("enableTokenActionHudIntegration", Boolean, true, "TENEBRE.Settings.EnableTokenActionHudIntegration", "TENEBRE.Settings.EnableTokenActionHudIntegrationHint");
    register("enableBithirUtilities", Boolean, true, "TENEBRE.Settings.EnableBithirUtilities", "TENEBRE.Settings.EnableBithirUtilitiesHint");
    register("enableGenerateShadow", Boolean, true, "TENEBRE.Settings.EnableGenerateShadow", "TENEBRE.Settings.EnableGenerateShadowHint");
    register("hideShadowGeneration", Boolean, false, "BITHIRMOD.SHADOW_hideGeneration", "BITHIRMOD.SHADOW_hideGeneration_hint");
    register("hideShadowLabel", Boolean, false, "BITHIRMOD.SHADOW_hideLabel", "BITHIRMOD.SHADOW_hideLabel_hint");
    register("hideCompatibilityNotice", Boolean, false, "TENEBRE.Settings.HideCompatibilityNotice", "TENEBRE.Settings.HideCompatibilityNoticeHint", { scope: "client" });
    register("compatibilityNoticeAcknowledged", Object, { version: 1, signatures: [] }, "TENEBRE.Settings.CompatibilityNoticeAcknowledged", "TENEBRE.Settings.CompatibilityNoticeAcknowledgedHint", { scope: "client" });
    register("encumbranceDiscoveredWeights", Object, { version: 2, items: {}, bundles: {} }, "TENEBRE.Settings.EncumbranceDiscoveredWeights", "TENEBRE.Settings.EncumbranceDiscoveredWeightsHint");
  }

  static get(key) {
    return game.settings.get(MODULE_ID, key);
  }

  static export() {
    return Object.fromEntries([...game.settings.settings.keys()]
      .filter((key) => key.startsWith(`${MODULE_ID}.`))
      .map((key) => {
        const settingKey = key.slice(MODULE_ID.length + 1);
        return [settingKey, game.settings.get(MODULE_ID, settingKey)];
      }));
  }
}

function register(key, type, defaultValue, name, hint, extra = {}) {
  if (game.settings.settings.has(`${MODULE_ID}.${key}`)) return;

  game.settings.register(MODULE_ID, key, {
    name,
    hint,
    scope: "world",
    config: false,
    default: defaultValue,
    type,
    ...extra,
    onChange: (value) => onSettingChanged(key, value)
  });
}

function onSettingChanged(key, value) {
  Hooks.callAll(MODULE_ID + ".settingsChanged", key, value);
  const requiresForcedSheetRender = [
    "enableRestButton",
    "enableClearEffectsButton",
    "enableBithirUtilities",
    "enableGenerateShadow",
    "hideShadowGeneration",
    "hideShadowLabel"
  ].includes(key);

  if (key === "enableHunger") {
    if (value) game.tenebreResources?.hunger?.registerStatusEffect?.();
    else game.tenebreResources?.hunger?.unregisterStatusEffect?.();
  }

  if (key === "enableEncumbrance" && value) {
    for (const actor of game.actors ?? []) {
      if (actor.type === "player" && (actor.isOwner || game.user?.isGM)) {
        game.tenebreResources?.encumbrance?.autoAssignAll?.(actor);
      }
    }
  }

  if (key === "encumbranceDiscoveredWeights") {
    game.tenebreResources?.encumbrance?.applyDynamicWeightConfig?.(value);
  }

  if (key === "enableMovementRuler" && value) {
    game.tenebreResources?.movement?.register?.();
  }

  if (key === "enableBithirUtilities" || key === "enableGenerateShadow" || key === "hideShadowGeneration" || key === "hideShadowLabel") {
    game.tenebreResources?.bithir?.refreshOpenActorSheets?.();
  }

  if (key === "enableTokenActionHudIntegration" || key === "enableManeuvers") {
    refreshTokenActionHud();
  }

  game.tenebreResources?.hotbar?.refresh?.();
  rerenderOpenSheets({ force: requiresForcedSheetRender });
}

function refreshTokenActionHud() {
  Hooks.callAll(`${MODULE_ID}.refreshTokenActionHud`);
  Hooks.callAll("forceUpdateTokenActionHud", { moduleId: MODULE_ID });

  const hud = globalThis.game?.tokenActionHud;
  if (typeof hud?.update === "function") {
    Promise.resolve(hud.update({ type: "hook", name: `${MODULE_ID}.settingsChanged` }))
      .catch((error) => console.warn(`${MODULE_ID} | Token Action HUD refresh failed.`, error));
  }
}

function rerenderOpenSheets({ force = false } = {}) {
  for (const app of Object.values(ui.windows ?? {})) {
    if (app?.actor || app?.item || app?.document?.documentName === "Actor" || app?.document?.documentName === "Item") {
      app.render?.(force);
    }
  }

  const instances = foundry.applications?.instances;
  if (instances && typeof instances[Symbol.iterator] === "function") {
    for (const app of instances) {
      if (app?.document?.documentName === "Actor" || app?.document?.documentName === "Item") {
        app.render?.({ force });
      }
    }
  }
}
