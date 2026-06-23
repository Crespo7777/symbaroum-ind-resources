import { AMMO_TYPES, FLAG_SCOPE, WEAPON_AMMO_TYPES, MODULE_ID } from "./constants.mjs";
import { AmmoService } from "./ammo.mjs";
import { RestService } from "./rest.mjs";
import { RationService } from "./rations.mjs";
import { TenebreSettings } from "./settings.mjs";
import { getAmmoModifiers, getSpecialAmmo } from "./special-ammo.mjs";
import {
  findAmmoItems,
  getAmmoType,
  getFlag,
  getWeaponAmmoType,
  isAmmo,
  isRation,
  sumItemQuantities,
  itemQuantity,
  getAmmoShots,
  isQuiver
} from "./item-flags.mjs";

// Listas de hooks
const ACTOR_SHEET_HOOKS = [
  "renderPlayerSheet",
  "renderSymbaroumActorSheet",
  "renderActorSheet"
];

const ITEM_SHEET_HOOKS = [
  "renderEquipmentSheet",
  "renderWeaponSheet",
  "renderSymbaroumItemSheet",
  "renderItemSheet"
];

// Registro de hooks

export function registerSheetHooks() {
  for (const hook of ACTOR_SHEET_HOOKS) Hooks.on(hook, onRenderActorSheet);
  for (const hook of ITEM_SHEET_HOOKS) Hooks.on(hook, renderItemFlags);
  Hooks.on("renderDialog", onRenderDialog);
  Hooks.on("renderTemplate", onRenderTemplate);
  Hooks.on("closeDialog", onCloseDialog);
  patchContextMenu();
  patchPlayerSheetHeaderButtons();
}

function getActorFromDom(elem) {
  if (!elem) return null;
  for (const app of Object.values(ui.windows)) {
    const el = app.element instanceof HTMLElement ? app.element : app.element?.[0];
    if (el && el.contains(elem)) {
      return app.actor ?? app.document;
    }
  }
  return game.canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character;
}

function patchContextMenu() {
  const handler = function(wrapped, html) {
    if (this.constructor.name === "CMPowerMenu") {
      if (!this._tenebrePatched) {
        this._tenebrePatched = true;

        this.originalMenuItems.push({
          name: "TENEBRE.Rations.ConsumeRationContextMenu",
          icon: `<i class="fas fa-bread-slice" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            return isRation(item) && itemQuantity(item) > 0;
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            if (actor) {
              RationService.consumeDay(actor);
            }
          }
        });

        this.originalMenuItems.push({
          name: "TENEBRE.Ammo.RecoverAmmoContextMenu",
          icon: `<i class="fas fa-arrows-rotate" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            if (item?.type !== "weapon") return false;
            const ammoType = getWeaponAmmoType(item);
            if (!ammoType) return false;
            const actor = item.parent;
            if (!actor) return false;
            const hits = AmmoService.getTrackedHits(actor);
            return hits.ammoHit > 0;
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            if (actor) {
              AmmoService.recover(actor);
            }
          }
        });

        this.originalMenuItems.push({
          name: "TENEBRE.Ammo.ConfigureAmmoContextMenu",
          icon: `<i class="fas fa-cog" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            return item?.type === "weapon";
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            const itemId = elem.dataset.itemId;
            const item = actor?.items?.get(itemId);
            if (item) {
              item.sheet.render(true);
            }
          }
        });

        // Re-filter this.menuItems immediately so the newly added options are rendered on the first click
        let item = null;
        if (html.dataset.itemId == game.symbaroum.config.noArmorID) {
          item = game.symbaroum.config.noArmorID;
        } else {
          item = this.myParent?.actor.items.get(html.dataset.itemId);
        }
        if (item) {
          this.menuItems = this.originalMenuItems.filter((elem) => {
            return elem.isVisible(item);
          });
        } else {
          this.menuItems = this.originalMenuItems;
        }
      }
    }
    return wrapped.call(this, html);
  };

  if (game.modules.get("libWrapper")?.active) {
    libWrapper.register(MODULE_ID, "foundry.applications.ux.ContextMenu.prototype.render", function(wrapped, html) {
      return handler.call(this, wrapped, html);
    }, "WRAPPER");
  } else {
    const originalRender = foundry.applications.ux.ContextMenu.prototype.render;
    foundry.applications.ux.ContextMenu.prototype.render = function(html) {
      const wrapped = (h) => originalRender.call(this, h);
      return handler.call(this, wrapped, html);
    };
  }
}


// Renderização da ficha de ator
function onRenderActorSheet(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "player" || !actor.isOwner) return;

  updateRationQuantityDisplay(app, html, actor);
}

// Injeta quantidade e usos de rações na ficha
function updateRationQuantityDisplay(app, html, actor) {
  if (!TenebreSettings.get("enableRations")) return;

  const el = getRoot(html);
  if (!el) return;

  const rationState = RationService.getState(actor);
  if (rationState.quantity <= 0) return;

  for (const item of rationState.items) {
    const row = el.querySelector(`.item[data-item-id="${item.id}"]`);
    if (!row) continue;

    const qtyDiv = row.querySelector(".quantity");
    if (!qtyDiv) continue;

    const qty = itemQuantity(item);
    if (qty > 0) {
      qtyDiv.textContent = `${qty} (${rationState.usesRemaining}/${rationState.usesPerUnit})`;
    }
  }
}

// Adiciona botão "Descanso" no cabeçalho da ficha do jogador
function patchPlayerSheetHeaderButtons() {
  const PlayerSheetClass = CONFIG.Actor.sheetClasses.player["symbaroum.PlayerSheet"]?.cls
    || Object.values(CONFIG.Actor.sheetClasses.player || {}).find(s => s.cls?.name === "PlayerSheet")?.cls;

  if (!PlayerSheetClass) {
    console.warn("Tenebre Resources | Could not find symbaroum.PlayerSheet in CONFIG.Actor.sheetClasses.player");
    return;
  }

  const handler = function(wrapped) {
    const buttons = wrapped.call(this);
    if (this.actor?.isOwner) {
      buttons.unshift({
        label: game.i18n.localize("TENEBRE.Rest.DialogTitle") || "Descanso",
        class: "tenebre-rest",
        icon: "fas fa-bed",
        onclick: async (ev) => {
          ev.preventDefault();
          await RestService.openRestDialog(this.actor);
        }
      });
    }
    return buttons;
  };

  if (game.modules.get("libWrapper")?.active) {
    libWrapper.register(
      MODULE_ID,
      "CONFIG.Actor.sheetClasses.player.symbaroum.PlayerSheet.cls.prototype._getHeaderButtons",
      function(wrapped) {
        return handler.call(this, wrapped);
      },
      "WRAPPER"
    );
  } else {
    const original = PlayerSheetClass.prototype._getHeaderButtons;
    PlayerSheetClass.prototype._getHeaderButtons = function() {
      const wrapped = () => original.call(this);
      return handler.call(this, wrapped);
    };
  }
}

// Renderização de flags na ficha do item (GM-only)
function renderItemFlags(app, html) {
  const item = app.item ?? app.document ?? app.object;
  if (!game.user.isGM) return;
  if (!item?.isOwner) return;
  if (!["equipment", "weapon"].includes(item.type)) return;

  const root = getRoot(html);
  if (!root || root.querySelector(".tenebre-item-flags")) return;

  const section = document.createElement("section");
  section.className = "tenebre-item-flags foreground border";
  section.innerHTML = item.type === "equipment" ? equipmentFlagHtml(item) : weaponFlagHtml(item);

  const target =
    root.querySelector(".sheet-body .tab[data-tab='stats'] .stats") ??
    root.querySelector(".sheet-body .tab[data-tab='description']") ??
    root.querySelector(".sheet-body") ??
    root.querySelector(".tab.active") ??
    root.querySelector(".window-content") ??
    root.querySelector("form");
  target?.append(section);

  // Wire change listeners
  section.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const field = event.currentTarget.dataset.flag;
      const type = event.currentTarget.type;
      const value = type === "checkbox" ? event.currentTarget.checked : event.currentTarget.value;
      await item.setFlag(FLAG_SCOPE, field, value);
    });
  });
}

// Construtores HTML das flags

function equipmentFlagHtml(item) {
  const itemIsAmmo = isAmmo(item);
  const itemIsRation = isRation(item);

  return `
    <h1>${game.i18n.localize("TENEBRE.ItemFlags.Title")}</h1>
    <label class="tenebre-check">
      <input type="checkbox" data-flag="isRation" ${itemIsRation ? "checked" : ""}>
      <span>${game.i18n.localize("TENEBRE.ItemFlags.IsRation")}</span>
    </label>
    <label class="tenebre-check">
      <input type="checkbox" data-flag="isAmmo" ${itemIsAmmo ? "checked" : ""}>
      <span>${game.i18n.localize("TENEBRE.ItemFlags.IsAmmo")}</span>
    </label>
  `;
}

function weaponFlagHtml(item) {
  const selected = getFlag(item, "weaponAmmoType", WEAPON_AMMO_TYPES.NONE);
  const compatibleAmmo = getWeaponAmmoType(item);
  const available = compatibleAmmo && item.parent
    ? sumItemQuantities(findAmmoItems(item.parent, compatibleAmmo))
    : 0;

  return `
    <h1>${game.i18n.localize("TENEBRE.ItemFlags.Title")}</h1>
    <label>
      <span>${game.i18n.localize("TENEBRE.ItemFlags.WeaponAmmoType")}</span>
      <select data-flag="weaponAmmoType">
        <option value="${WEAPON_AMMO_TYPES.NONE}" ${selected === WEAPON_AMMO_TYPES.NONE ? "selected" : ""}>Não</option>
        <option value="${WEAPON_AMMO_TYPES.BOW}"  ${selected !== WEAPON_AMMO_TYPES.NONE ? "selected" : ""}>Sim</option>
      </select>
    </label>
    ${compatibleAmmo ? `<p>${game.i18n.format("TENEBRE.ItemFlags.CompatibleAmmo", { quantity: available })}</p>` : ""}
  `;
}

// Funções auxiliares

function getRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

// Hooks do diálogo de rolagem

function onRenderTemplate(path, data, html) {
  if (path && path.includes("systems/symbaroum/template/chat/dialog.hbs")) {
    if (game.tenebreResources?.activeWeaponRoll) {
      game.tenebreResources.activeWeaponModifiers = data.weaponModifiers;
    }
  }
}

function onRenderDialog(dialog, html, data) {
  const el = getRoot(html);
  if (!el) return;

  const isWeaponRoll = Boolean(el.querySelector("input[id^='weapondamage-']"));
  if (isWeaponRoll) {
    // Altera atributo alvo para defesa por padrão
    const targetAttrSelect = el.querySelector("select[id^='targetAttribute-']");
    if (targetAttrSelect && targetAttrSelect.value === "custom") {
      const hasDefense = Array.from(targetAttrSelect.options).some(opt => opt.value === "defense");
      if (hasDefense) {
        targetAttrSelect.value = "defense";
      }
    }

    // Envolve callback de rolagem
    if (dialog.data?.buttons?.roll) {
      const originalCallback = dialog.data.buttons.roll.callback;
      if (originalCallback && !originalCallback._tenebreWrapped) {
        dialog.data.buttons.roll.callback = async function(htmlElement, event) {
          const htmlParam = (htmlElement && !(0 in htmlElement)) ? [htmlElement] : htmlElement;
          
          const activeRoll = game.tenebreResources?.activeWeaponRoll;
          if (activeRoll) {
            try {
              const selectedId = el.querySelector("#tenebre-ammo-select")?.value;
              const chosenAmmo = activeRoll.actor.items.get(selectedId);
              if (chosenAmmo) {
                activeRoll.selectedAmmo = chosenAmmo;

                const ammoMods = getAmmoModifiers(chosenAmmo);
                const weaponModifiers = game.tenebreResources.activeWeaponModifiers;
                if (weaponModifiers && ammoMods.length > 0) {
                  if (!weaponModifiers.package) {
                    weaponModifiers.package = [{
                      label: "Default",
                      type: "default",
                      member: []
                    }];
                  }
                  let defaultPackage = weaponModifiers.package.find(
                    p => p.type === "default" || p.type === game.symbaroum.config.PACK_DEFAULT
                  );
                  if (!defaultPackage) {
                    defaultPackage = {
                      label: "Default",
                      type: "default",
                      member: []
                    };
                    weaponModifiers.package.push(defaultPackage);
                  }
                  for (const mod of ammoMods) {
                    if (!defaultPackage.member.some(m => m.id === mod.id && m.type === mod.type)) {
                      defaultPackage.member.push(mod);
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Tenebre Resources | Error preparing ammo modifiers:", err);
              ui.notifications.error("Error preparing ammo modifiers: " + err.message);
            }
          }

          try {
            return await originalCallback.call(this, htmlParam, event);
          } catch (err) {
            console.error("Tenebre Resources | Error in original roll callback:", err);
            throw err;
          }
        };
        dialog.data.buttons.roll.callback._tenebreWrapped = true;
      }
    }
  }

  // Injeta seletor de munição para ataques à distância
  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  if (!activeRoll) return;

  const damModInput = el.querySelector("input[id^='dammodifier-']");
  if (!damModInput) return;

  const damModDiv = damModInput.closest(".damagemodifier");
  if (!damModDiv) return;

  if (el.querySelector("#tenebre-ammo-select")) return;

  const { actor, ammoType } = activeRoll;
  const ammoItems = findAmmoItems(actor, ammoType);
  if (!ammoItems.length) return;

  const selectDiv = document.createElement("div");
  selectDiv.className = "bonus";
  
  const label = document.createElement("label");
  label.setAttribute("for", "tenebre-ammo-select");
  label.innerText = game.i18n.localize("TENEBRE.Ammo.Ammo");

  const select = document.createElement("select");
  select.id = "tenebre-ammo-select";

  const quiver = ammoItems.find(isQuiver);
  const hasQuiver = !!quiver;

  if (hasQuiver) {
    const looseAmmo = ammoItems.filter(item => !isQuiver(item) && !getSpecialAmmo(item));
    const looseShots = looseAmmo.reduce((sum, item) => sum + itemQuantity(item), 0);

    for (const item of ammoItems) {
      if (isQuiver(item)) {
        const qty = getAmmoShots(item) + looseShots;
        const option = document.createElement("option");
        option.value = item.id;
        option.innerText = `${item.name} (${qty})`;
        select.appendChild(option);
      } else if (getSpecialAmmo(item)) {
        const qty = getAmmoShots(item);
        const option = document.createElement("option");
        option.value = item.id;
        option.innerText = `${item.name} (${qty})`;
        select.appendChild(option);
      }
    }
  } else {
    for (const item of ammoItems) {
      const qty = getAmmoShots(item);
      const option = document.createElement("option");
      option.value = item.id;
      option.innerText = `${item.name} (${qty})`;
      select.appendChild(option);
    }
  }

  selectDiv.appendChild(label);
  selectDiv.appendChild(select);

  damModDiv.after(selectDiv);

  el.style.overflow = "visible";
  el.style.height = "auto";
  const form = el.closest("form");
  if (form) {
    form.style.overflow = "visible";
    form.style.height = "auto";
  }
  const win = el.closest(".window-content");
  if (win) {
    win.style.overflow = "visible";
    win.style.height = "auto";
  }
  dialog.setPosition({ height: "auto" });
}

function onCloseDialog(dialog, html) {
  if (game.tenebreResources?.activeWeaponRoll) {
    setTimeout(() => {
      if (game.tenebreResources) {
        game.tenebreResources.activeWeaponRoll = null;
        game.tenebreResources.activeWeaponModifiers = null;
      }
    }, 100);
  }
}

