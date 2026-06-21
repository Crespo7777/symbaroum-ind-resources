import { ATTRIBUTE_CHOICES, DEFAULTS, MODULE_ID } from "./constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TenebreSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tenebre-resources-settings",
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
      template: "modules/tenebre-resources/templates/settings.hbs"
    }
  };

  async _prepareContext(_options) {
    return {
      settings: TenebreSettings.export(),
      attributes: localizedChoices(ATTRIBUTE_CHOICES),
      isGM: game.user.isGM
    };
  }



  static async #onSubmit(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    for (const key of BOOLEAN_SETTINGS) {
      data[key] = Boolean(data[key]);
    }

    for (const key of NUMBER_SETTINGS) {
      data[key] = Number(data[key]);
    }

    for (const [key, value] of Object.entries(data)) {
      if (!game.settings.settings.has(`${MODULE_ID}.${key}`)) continue;
      await game.settings.set(MODULE_ID, key, value);
    }
  }
}

const BOOLEAN_SETTINGS = [
  "enableRations",
  "enableAmmoConsumption",
  "enableHitTracking",
  "enableAmmoRecovery",
  "showSpecialAmmoInChat",
  "enableRestHealing"
];

const NUMBER_SETTINGS = [
  "rationUses",
  "restHealing",
  "recoveryFailure",
  "recoverySuccess",
  "recoveryCritical"
];

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
    register("enableRestHealing", Boolean, true, "TENEBRE.Settings.EnableRestHealing", "TENEBRE.Settings.EnableRestHealingHint");
    register("restHealing", Number, DEFAULTS.restHealing, "TENEBRE.Settings.RestHealing", "TENEBRE.Settings.RestHealingHint");

    game.settings.register(MODULE_ID, "recoveryAttribute", {
      name: "TENEBRE.Settings.RecoveryAttribute",
      hint: "TENEBRE.Settings.RecoveryAttributeHint",
      scope: "world",
      config: false,
      default: DEFAULTS.recoveryAttribute,
      type: String,
      choices: localizedChoices(ATTRIBUTE_CHOICES)
    });

    register("recoveryFailure", Number, DEFAULTS.recoveryFailure, "TENEBRE.Settings.RecoveryFailure", "TENEBRE.Settings.RecoveryFailureHint");
    register("recoverySuccess", Number, DEFAULTS.recoverySuccess, "TENEBRE.Settings.RecoverySuccess", "TENEBRE.Settings.RecoverySuccessHint");
    register("recoveryCritical", Number, DEFAULTS.recoveryCritical, "TENEBRE.Settings.RecoveryCritical", "TENEBRE.Settings.RecoveryCriticalHint");
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
    type
  });
}

function localizedChoices(choices) {
  return Object.fromEntries(Object.entries(choices).map(([key, label]) => [key, game.i18n.localize(label)]));
}
