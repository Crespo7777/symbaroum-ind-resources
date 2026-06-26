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
    return {
      settings: TenebreSettings.export(),
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
      "showSpecialAmmoInChat",
      "enableHunger",
      "enableRestHealing",
      "enableEncumbrance"
    ];

    const numbers = [
      "rationUses",
      "restHealing"
    ];

    for (const key of booleans) {
      data[key] = Boolean(data[key]);
    }

    for (const key of numbers) {
      if (key in data) {
        data[key] = Number(data[key]);
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
    register("showSpecialAmmoInChat", Boolean, true, "TENEBRE.Settings.ShowSpecialAmmoInChat", "TENEBRE.Settings.ShowSpecialAmmoInChatHint");
    register("enableHunger", Boolean, true, "TENEBRE.Settings.EnableHunger", "TENEBRE.Settings.EnableHungerHint");
    register("enableRestHealing", Boolean, true, "TENEBRE.Settings.EnableRestHealing", "TENEBRE.Settings.EnableRestHealingHint");
    register("restHealing", Number, DEFAULTS.restHealing, "TENEBRE.Settings.RestHealing", "TENEBRE.Settings.RestHealingHint");

    register("enableEncumbrance", Boolean, true, "TENEBRE.Settings.EnableEncumbrance", "TENEBRE.Settings.EnableEncumbranceHint");
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

function register(key, type, defaultValue, name, hint) {
  game.settings.register(MODULE_ID, key, {
    name,
    hint,
    scope: "world",
    config: false,
    default: defaultValue,
    type,
    onChange: (value) => onSettingChanged(key, value)
  });
}

function onSettingChanged(key, value) {
  Hooks.callAll(MODULE_ID + ".settingsChanged", key, value);

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

  game.tenebreResources?.hotbar?.refresh?.();
  rerenderOpenSheets();
}

function rerenderOpenSheets() {
  for (const app of Object.values(ui.windows ?? {})) {
    if (app?.actor || app?.item || app?.document?.documentName === "Actor" || app?.document?.documentName === "Item") {
      app.render?.(false);
    }
  }

  const instances = foundry.applications?.instances;
  if (instances && typeof instances[Symbol.iterator] === "function") {
    for (const app of instances) {
      if (app?.document?.documentName === "Actor" || app?.document?.documentName === "Item") {
        app.render?.({ force: false });
      }
    }
  }
}
