import { AMMO_TYPES, FLAG_SCOPE, WEAPON_AMMO_TYPES, MODULE_ID } from "./constants.mjs";
import { AmmoService } from "./ammo.mjs";
import { RestService } from "./rest.mjs";
import { RationService } from "./rations.mjs";
import { TenebreSettings } from "./settings.mjs";
import { getAmmoModifiers } from "./special-ammo.mjs";
import {
  findAmmoItems,
  getAmmoType,
  getFlag,
  getWeaponAmmoType,
  isAmmo,
  isRation,
  sumItemQuantities,
  itemQuantity,
  getAmmoShots
} from "./item-flags.mjs";

// ── Hook lists ────────────────────────────────────────────────────────────────

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

// ── Registration ──────────────────────────────────────────────────────────────

export function registerSheetHooks() {
  for (const hook of ACTOR_SHEET_HOOKS) Hooks.on(hook, onRenderActorSheet);
  for (const hook of ITEM_SHEET_HOOKS) Hooks.on(hook, renderItemFlags);
  Hooks.on("renderDialog", onRenderDialog);
  Hooks.on("renderTemplate", onRenderTemplate);
  Hooks.on("closeDialog", onCloseDialog);
  patchContextMenu();
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
            return (ammoType === AMMO_TYPES.ARROW && hits.arrowsHit > 0) ||
                   (ammoType === AMMO_TYPES.BOLT && hits.boltsHit > 0);
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


// ── Actor sheet ───────────────────────────────────────────────────────────────

/**
 * Called on every PlayerSheet render.
 * 1. Intercepts the system "Recuperar" header button to open our rest dialog.
 * 2. Injects ammo badges into ranged weapon rows.
 */
function onRenderActorSheet(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "player" || !actor.isOwner) return;

  interceptRecoverButton(app, actor);
}

/**
 * Intercepts the system "Recuperar" (recover-death-roll) button in the sheet header
 * and replaces it with our rest dialog. Only patches once per button element.
 */
function interceptRecoverButton(app, actor) {
  // The button lives in the window frame, NOT inside the sheet's html content.
  // app.element is the window jQuery object in ApplicationV1.
  const win = app.element instanceof HTMLElement ? app.element : app.element?.[0];
  if (!win) return;

  const btn = win.querySelector(".recover-death-roll");
  if (!btn || btn.dataset.tenebrePatched) return;

  btn.dataset.tenebrePatched = "1";

  // Use capture phase to fire before the system's onclick handler
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    await RestService.openRestDialog(actor);
  }, { capture: true });
}

// ── Item sheet ────────────────────────────────────────────────────────────────

/**
 * Appends Tenebre flags section (isRation, isAmmo, weaponAmmoType) to item sheets.
 * GM-only.
 */
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

// ── Flag HTML builders ────────────────────────────────────────────────────────

function equipmentFlagHtml(item) {
  const itemIsAmmo = isAmmo(item);
  const itemIsRation = isRation(item);
  const ammoType = getAmmoType(item) || AMMO_TYPES.ARROW;

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
    <label>
      <span>${game.i18n.localize("TENEBRE.ItemFlags.AmmoType")}</span>
      <select data-flag="ammoType">
        <option value="${AMMO_TYPES.ARROW}" ${ammoType === AMMO_TYPES.ARROW ? "selected" : ""}>${game.i18n.localize("TENEBRE.Ammo.Arrow")}</option>
        <option value="${AMMO_TYPES.BOLT}"  ${ammoType === AMMO_TYPES.BOLT  ? "selected" : ""}>${game.i18n.localize("TENEBRE.Ammo.Bolt")}</option>
      </select>
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
        <option value="${WEAPON_AMMO_TYPES.NONE}"      ${selected === WEAPON_AMMO_TYPES.NONE      ? "selected" : ""}>${game.i18n.localize("TENEBRE.ItemFlags.NoAmmo")}</option>
        <option value="${WEAPON_AMMO_TYPES.BOW}"       ${selected === WEAPON_AMMO_TYPES.BOW       ? "selected" : ""}>${game.i18n.localize("TENEBRE.ItemFlags.Bow")}</option>
        <option value="${WEAPON_AMMO_TYPES.CROSSBOW}"  ${selected === WEAPON_AMMO_TYPES.CROSSBOW  ? "selected" : ""}>${game.i18n.localize("TENEBRE.ItemFlags.Crossbow")}</option>
      </select>
    </label>
    ${compatibleAmmo ? `<p>${game.i18n.format("TENEBRE.ItemFlags.CompatibleAmmo", { quantity: available })}</p>` : ""}
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

// ── Dialog Hooks ─────────────────────────────────────────────────────────────

function onRenderTemplate(path, data, html) {
  if (path && path.includes("systems/symbaroum/template/chat/dialog.hbs")) {
    if (game.tenebreResources?.activeWeaponRoll) {
      game.tenebreResources.activeWeaponModifiers = data.weaponModifiers;
    }
  }
}

function onRenderDialog(dialog, html, data) {
  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  if (!activeRoll) return;

  const el = getRoot(html);
  if (!el) return;

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

  for (const item of ammoItems) {
    const qty = getAmmoShots(item);
    const option = document.createElement("option");
    option.value = item.id;
    option.innerText = `${item.name} (${qty})`;
    select.appendChild(option);
  }

  selectDiv.appendChild(label);
  selectDiv.appendChild(select);

  damModDiv.after(selectDiv);

  // Auto-adjust dialog window size and prevent scrollbars
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

  if (dialog.data?.buttons?.roll) {
    const originalCallback = dialog.data.buttons.roll.callback;
    dialog.data.buttons.roll.callback = async function(htmlElement, event) {
      try {
        const selectedId = el.querySelector("#tenebre-ammo-select")?.value;
        const chosenAmmo = actor.items.get(selectedId);
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

      try {
        return await originalCallback.call(this, htmlElement, event);
      } catch (err) {
        console.error("Tenebre Resources | Error in original roll callback:", err);
        throw err;
      }
    };
  }
}

function onCloseDialog(dialog, html) {
  if (game.tenebreResources?.activeWeaponRoll) {
    // Delay slightly to allow the submit callback to complete execution and read active rolls
    setTimeout(() => {
      if (game.tenebreResources) {
        game.tenebreResources.activeWeaponRoll = null;
        game.tenebreResources.activeWeaponModifiers = null;
      }
    }, 100);
  }
}

