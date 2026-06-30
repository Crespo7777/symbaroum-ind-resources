import { FLAG_SCOPE, MODULE_ID } from "./constants.mjs";
import { AmmoService } from "./ammo.mjs";
import { RestService } from "./rest.mjs";
import { RationService } from "./rations.mjs";
import { TenebreSettings } from "./settings.mjs";
import { getAmmoModifiers, getSpecialAmmo } from "./special-ammo.mjs";
import { EncumbranceService } from "./encumbrance.mjs";
import { ContainerService } from "./containers.mjs";
import { matchesSymbaroumLabel, symbaroumLabelVariants } from "./symbaroum-i18n.mjs";
import { normalize } from "./utils.mjs";
import { ManeuverService } from "./maneuvers.mjs";
import { SocketService } from "./sockets.mjs";
import {
  actorItems,
  findLoadedQuiverItems,
  getWeaponAmmoType,
  isAmmo,
  isRation,
  itemQuantity,
  isQuiver,
  getQuiverLoadedAmmo,
  getQuiverLoadedTotal
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
  "renderArmorSheet",
  "renderSymbaroumItemSheet",
  "renderItemSheet"
];

const selectedManeuversByActor = new Map();

// Registro de hooks

export function registerSheetHooks() {
  patchSymbaroumSheetListeners();
  for (const hook of ACTOR_SHEET_HOOKS) Hooks.on(hook, onRenderActorSheet);
  for (const hook of ITEM_SHEET_HOOKS) {
    Hooks.on(hook, onRenderItemSheet);
  }
  Hooks.on("renderApplication", onRenderApplication);
  Hooks.on("renderDialog", onRenderDialog);
  Hooks.on("renderTemplate", onRenderTemplate);
  Hooks.on("closeDialog", onCloseDialog);
  patchContextMenu();
  patchPlayerSheetHeaderButtons();
}

/**
 * Foundry v13: injeta UI via activateListeners (sempre executado ao renderizar a ficha).
 * Hooks legados como renderActorSheet não existem mais no core.
 */
function patchSymbaroumSheetListeners() {
  for (const SheetClass of getSymbaroumSheetClasses("Actor", "player")) {
    patchSheetActivateListeners(SheetClass, (app, html) => onRenderActorSheet(app, html));
  }

  for (const type of ["equipment", "weapon", "armor"]) {
    for (const SheetClass of getSymbaroumSheetClasses("Item", type)) {
      patchSheetActivateListeners(SheetClass, (app, html) => onRenderItemSheet(app, html));
    }
  }
}

function getSymbaroumSheetClasses(documentName, subType) {
  const entries = CONFIG[documentName]?.sheetClasses?.[subType] ?? {};
  return Object.values(entries)
    .filter((entry) => entry.id?.startsWith("symbaroum."))
    .map((entry) => entry.cls)
    .filter(Boolean);
}

function patchSheetActivateListeners(SheetClass, callback) {
  if (!SheetClass?.prototype || SheetClass.prototype._tenebreActivatePatched) return;
  SheetClass.prototype._tenebreActivatePatched = true;

  const original = SheetClass.prototype.activateListeners;
  SheetClass.prototype.activateListeners = function tenebreActivateListeners(html) {
    original.call(this, html);
    try {
      callback(this, html);
    } catch (err) {
      console.error(`${MODULE_ID} | Sheet UI injection failed (${SheetClass.name}):`, err);
    }
  };
}

function onRenderApplication(app, html) {
  const name = app.constructor?.name;
  if (name === "PlayerSheet") {
    onRenderActorSheet(app, html);
  } else if (["EquipmentSheet", "WeaponSheet", "ArmorSheet"].includes(name)) {
    onRenderItemSheet(app, html);
  }
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
          name: "TENEBRE.Containers.StoreContextMenu",
          icon: `<i class="fas fa-box-open" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            const actor = this.myParent?.actor;
            return TenebreSettings.get("enableEncumbrance")
              && ContainerService.canAttemptStoreItem(item)
              && ContainerService.getContainers(actor, item).length > 0;
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            const itemId = elem.dataset.itemId;
            const item = actor?.items?.get(itemId);
            if (actor && item) {
              ContainerService.storeItemPrompt(actor, item).then(() => rerenderActorSheets(actor));
            }
          }
        });

        this.originalMenuItems.push({
          name: "TENEBRE.Containers.OpenContextMenu",
          icon: `<i class="fas fa-box" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            return TenebreSettings.get("enableEncumbrance") && ContainerService.isContainer(item);
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            const itemId = elem.dataset.itemId;
            const item = actor?.items?.get(itemId);
            if (actor && item) {
              ContainerService.openContainer(actor, item);
            }
          }
        });

        this.originalMenuItems.push({
          name: "TENEBRE.Rations.ConsumeRationContextMenu",
          icon: `<i class="fas fa-bread-slice" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            return TenebreSettings.get("enableRations") && isRation(item) && itemQuantity(item) > 0;
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
            if (!TenebreSettings.get("enableAmmoRecovery")) return false;
            if (!isPlayerActor(item?.parent)) return false;
            if (item?.type !== "weapon") return false;
            const ammoType = getWeaponAmmoType(item);
            return Boolean(ammoType);
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            if (actor) {
              AmmoService.recover(actor);
            }
          }
        });

        this.originalMenuItems.push({
          name: "TENEBRE.Ammo.ReloadQuiverContextMenu",
          icon: `<i class="fas fa-redo" style="color: currentColor;"></i>`,
          isVisible: (item) => {
            return TenebreSettings.get("enableAmmoConsumption")
              && isPlayerActor(item?.parent)
              && isQuiver(item)
              && itemQuantity(item) > 0;
          },
          callback: function(elem) {
            const actor = getActorFromDom(elem);
            const itemId = elem.dataset.itemId;
            const item = actor?.items?.get(itemId);
            if (actor && item) {
              AmmoService.reloadQuiverPrompt(actor, item);
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
  if (!actor || actor.type !== "player") return;
  if (!actor.isOwner && !game.user.isGM) return;

  hideStoredItemRows(app, html, actor);
  injectContainerInlineLists(app, html, actor);
  updateRationQuantityDisplay(app, html, actor);
  updateQuiverQuantityDisplay(app, html, actor);
  injectEncumbrancePanel(app, html, actor);
  injectManeuverPanel(app, html, actor);
}

function hideStoredItemRows(app, html, actor) {
  const el = getRoot(html);
  if (!el) return;

  const hideRows = () => {
    for (const item of actorItems(actor)) {
      if (!ContainerService.isStored(item)) continue;
      const row = el.querySelector(`[data-item-id="${item.id}"]`);
      if (!row) continue;
      row.hidden = true;
      row.style.display = "none";
      row.classList.add("tenebre-hidden-stored-item");
    }
  };

  hideRows();
  setTimeout(hideRows, 0);
  setTimeout(hideRows, 100);
}

function injectContainerInlineLists(app, html, actor) {
  if (!TenebreSettings.get("enableEncumbrance")) return;

  const el = getRoot(html);
  if (!el) return;

  el.querySelectorAll(".tenebre-container-inline-row").forEach((row) => row.remove());

  for (const container of actorItems(actor)) {
    if (!ContainerService.isContainer(container) || ContainerService.isStored(container)) continue;

    const row = el.querySelector(`[data-item-id="${container.id}"]`);
    if (!row || row.classList.contains("tenebre-hidden-stored-item")) continue;

    const expanded = ContainerService.isContainerExpanded(actor, container);
    row.classList.toggle("tenebre-container-expanded", expanded);
    row.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (!expanded) continue;

    row.insertAdjacentElement("afterend", buildContainerInlineRow(actor, container, row));
  }
}

function buildContainerInlineRow(actor, container, anchorRow) {
  const isTableRow = anchorRow?.tagName === "TR";
  const tagName = isTableRow
    ? "tr"
    : anchorRow?.tagName === "LI"
      ? "li"
      : "div";

  const row = document.createElement(tagName);
  row.className = "tenebre-container-inline-row";
  row.dataset.containerId = container.id;

  const content = document.createElement("div");
  content.className = "tenebre-container-inline";

  const storedItems = ContainerService.getStoredItems(actor, container);
  if (!storedItems.length) {
    const empty = document.createElement("p");
    empty.className = "tenebre-container-empty";
    empty.textContent = game.i18n.localize("TENEBRE.Containers.Empty");
    content.appendChild(empty);
  } else {
    const list = document.createElement("ol");
    list.className = "tenebre-container-list";
    for (const item of storedItems) {
      list.appendChild(buildContainerInlineItem(actor, item));
    }
    content.appendChild(list);
  }

  if (isTableRow) {
    const cell = document.createElement("td");
    cell.colSpan = Math.max(1, anchorRow.children.length || 1);
    cell.appendChild(content);
    row.appendChild(cell);
  } else {
    row.appendChild(content);
  }

  return row;
}

function buildContainerInlineItem(actor, item) {
  const row = document.createElement("li");
  row.className = "tenebre-container-item";
  row.dataset.storedItemId = item.id;

  const img = document.createElement("img");
  img.src = item.img || "icons/svg/item-bag.svg";
  img.alt = "";
  row.appendChild(img);

  const name = document.createElement("span");
  name.className = "tenebre-container-name";
  name.textContent = item.name;
  row.appendChild(name);

  const quantity = document.createElement("span");
  quantity.className = "tenebre-container-qty";
  quantity.textContent = String(item.type === "equipment" ? itemQuantity(item) : 1);
  row.appendChild(quantity);

  const withdraw = document.createElement("button");
  withdraw.type = "button";
  withdraw.textContent = game.i18n.localize("TENEBRE.Containers.Withdraw");
  withdraw.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await ContainerService.withdrawItemPrompt(actor, item);
    rerenderActorSheets(actor);
  });
  row.appendChild(withdraw);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = game.i18n.localize("TENEBRE.Containers.Edit");
  edit.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    item.sheet?.render(true);
  });
  row.appendChild(edit);

  return row;
}

function rerenderActorSheets(actor) {
  if (!actor) return;
  for (const app of Object.values(ui.windows ?? {})) {
    const sheetActor = app.actor ?? app.document;
    if (sheetActor?.id === actor.id && typeof app.render === "function") {
      app.render(false);
    }
  }
}

// Injeta quantidade e usos de aljavas na ficha
function updateQuiverQuantityDisplay(app, html, actor) {
  if (!isPlayerActor(actor)) return;

  const el = getRoot(html);
  if (!el) return;

  const quivers = actor.items.filter(isQuiver);
  for (const quiver of quivers) {
    const row = el.querySelector(`.item[data-item-id="${quiver.id}"]`);
    if (!row) continue;

    const qtyDiv = row.querySelector(".quantity");
    if (!qtyDiv) continue;

    const qty = itemQuantity(quiver);
    if (qty > 0) {
      const loaded = getQuiverLoadedTotal(quiver);
      qtyDiv.textContent = `${qty} (${loaded}/12)`;
    }
  }
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

      if (hasActorEffects(this.actor)) {
        buttons.unshift({
          label: game.i18n.localize("TENEBRE.Maneuvers.ClearEffects"),
          class: "tenebre-clear-effects",
          icon: "fas fa-eraser",
          onclick: async (ev) => {
            ev.preventDefault();
            const count = await clearActorEffects(this.actor);
            ui.notifications.info(game.i18n.format("TENEBRE.Maneuvers.ClearEffectsDone", { count }));
            this.render(false);
          }
        });
      }
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

function onRenderItemSheet(app, html) {
  const item = app.item ?? app.document ?? app.object;
  if (!item) return;
  if (!item.isOwner && !game.user.isGM) return;

  if (TenebreSettings.get("enableEncumbrance")) {
    injectItemWeightField(app, html, item);
  }
}

// Campo "Peso" na aba Descrição/Estatísticas (estilo Custo / Número)
async function injectItemWeightField(app, html, item) {
  if (!["equipment", "weapon", "armor"].includes(item.type)) return;

  const root = getRoot(html);
  if (!root) return;

  const existingRows = Array.from(root.querySelectorAll(".tenebre-weight-row"));
  if (existingRows.length === 1) return;
  if (existingRows.length > 1) {
    existingRows.slice(1).forEach((row) => row.remove());
    return;
  }

  if (root.dataset?.tenebreWeightInjecting === "true") return;
  if (root.dataset) root.dataset.tenebreWeightInjecting = "true";

  try {
    await EncumbranceService.autoAssignSlots(item);
  } catch (err) {
    if (root.dataset) delete root.dataset.tenebreWeightInjecting;
    throw err;
  }

  const numberRow = findItemWeightAnchor(root, item);
  if (!numberRow) {
    if (root.dataset) delete root.dataset.tenebreWeightInjecting;
    return;
  }

  root.querySelectorAll(".tenebre-weight-row").forEach((row) => row.remove());

  const slots = getDisplayedItemWeight(item);
  const editable = Boolean(app.isEditable && item.isOwner);
  const row = createWeightRow(slots, editable, numberRow.style);

  numberRow.element.insertAdjacentElement(numberRow.insert, row);
  if (root.dataset) root.dataset.tenebreWeightInjected = "true";

  const input = row.querySelector(".tenebre-weight-input");
  input?.addEventListener("change", async (event) => {
    const value = Math.max(0, Math.min(10, Number(event.currentTarget.value) || 0));
    event.currentTarget.value = value;
    await item.setFlag(FLAG_SCOPE, "encumbranceSlots", value);
    await item.setFlag(FLAG_SCOPE, "encumbranceManual", true);
    await EncumbranceService.rememberItemWeight(item, value);
    refreshActorEncumbrance(item.parent);
  });
}

function findItemWeightAnchor(root, item) {
  const numberKeys = item.type === "weapon"
    ? ["WEAPON.NUMBER", "EQUIPMENT.NUMBER"]
    : ["EQUIPMENT.NUMBER", "WEAPON.NUMBER"];

  const numberInput = root.querySelector('input[name="system.number"]');
  if (numberInput) {
    const row = numberInput.closest(".gridrow, .number");
    if (row) {
      return {
        element: row,
        insert: "afterend",
        style: row.classList.contains("gridrow") ? "gridrow" : "symbaroum"
      };
    }
  }

  for (const row of root.querySelectorAll(".gridrow")) {
    const label = row.querySelector(".gridcolumn:first-child");
    if (matchesSymbaroumLabel(label?.textContent, ...numberKeys)) {
      return { element: row, insert: "afterend", style: "gridrow" };
    }
  }

  for (const row of root.querySelectorAll(".number")) {
    const label = row.querySelector("label");
    if (matchesSymbaroumLabel(label?.textContent, ...numberKeys)) {
      return { element: row, insert: "afterend", style: "symbaroum" };
    }
  }

  if (item.type === "armor") {
    const costInput = root.querySelector('input[name="system.cost"]');
    if (costInput) {
      const costDiv = costInput.closest(".cost");
      if (costDiv) return { element: costDiv, insert: "afterend", style: "symbaroum" };
    }
  }

  return null;
}

function createWeightRow(slots, editable, style) {
  const label = game.i18n.localize("TENEBRE.Encumbrance.Weight");
  const disabled = editable ? "" : "disabled";
  const inputHtml = `
    <input
      type="number"
      class="tenebre-weight-input"
      value="${slots}"
      min="0"
      max="10"
      step="1"
      ${disabled}
    >
  `;

  const row = document.createElement("div");
  if (style === "gridrow") {
    row.className = "gridrow tenebre-weight-row";
    row.innerHTML = `
      <div class="gridcolumn">${label}</div>
      <div class="gridcolumn data">${inputHtml}</div>
    `;
  } else {
    row.className = "number tenebre-weight-row";
    row.innerHTML = `<label>${label}</label>${inputHtml}`;
  }
  return row;
}

function refreshActorEncumbrance(actor) {
  if (!actor) return;
  for (const app of Object.values(ui.windows)) {
    const sheetActor = app.actor ?? app.document;
    if (sheetActor?.id === actor.id && typeof app.render === "function") {
      app.render(false);
    }
  }
}

// Indicador de carga ao lado do título "Equipamento" na aba Gear
function injectEncumbrancePanel(app, html, actor) {
  if (!TenebreSettings.get("enableEncumbrance")) return;

  const el = getRoot(html);
  if (!el) return;

  const load = EncumbranceService.calculateLoad(actor);
  const title = findEquipmentSectionTitle(el, actor);
  if (!title) return;

  let indicator = title.querySelector(".tenebre-enc-indicator");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "tenebre-enc-indicator";
    title.appendChild(indicator);
  }

  indicator.innerHTML = buildEncumbranceIndicatorHtml(load);
  indicator.title = game.i18n.format("TENEBRE.Encumbrance.BarTooltip", {
    current: load.currentLoad,
    capacity: load.capacity,
    max: load.maxCapacity,
    strong: load.strong
  });
}

function findEquipmentSectionTitle(root, actor) {
  const equipmentsSection = root.querySelector(".equipments");
  if (equipmentsSection) {
    const h1 = equipmentsSection.querySelector(":scope > h1") ?? equipmentsSection.querySelector("h1");
    if (h1) return h1;
  }

  const titleVariants = symbaroumLabelVariants("TITLE.EQUIPMENTS");
  for (const h1 of root.querySelectorAll("h1")) {
    if (matchesEquipmentTitle(h1, titleVariants)) return h1;
  }

  for (const header of root.querySelectorAll("li.equipment.item-header")) {
    const qty = header.querySelector(".quantity");
    if (matchesSymbaroumLabel(qty?.textContent, "EQUIPMENT.QUANTITY_SHORT")) {
      return header.closest(".equipments")?.querySelector("h1") ?? null;
    }
  }

  if (actor) {
    for (const row of root.querySelectorAll(".equipments [data-item-id]")) {
      const item = actor.items.get(row.dataset.itemId);
      if (item?.type === "equipment") {
        return row.closest(".equipments")?.querySelector("h1") ?? null;
      }
    }
  }

  return null;
}

function matchesEquipmentTitle(h1, titleVariants) {
  const clone = h1.cloneNode(true);
  clone.querySelector(".tenebre-enc-indicator")?.remove();
  clone.querySelector("a")?.remove();
  return titleVariants.has(normalize(clone.textContent || ""));
}

function buildEncumbranceIndicatorHtml(load) {
  let statusClass = "";
  let statusText = "";

  if (load.isImmobilized) {
    statusClass = "tenebre-enc-immobilized";
    statusText = game.i18n.localize("TENEBRE.Encumbrance.Immobilized");
  } else if (load.isOverloaded) {
    statusClass = "tenebre-enc-overloaded";
    statusText = game.i18n.format("TENEBRE.Encumbrance.DefensePenalty", { penalty: load.defensePenalty });
  }

  const loadText = game.i18n.format("TENEBRE.Encumbrance.Indicator", {
    current: load.currentLoad,
    capacity: load.capacity
  });

  const porterBadge = load.hasPorter
    ? ` <span class="tenebre-enc-porter" title="${game.i18n.localize("TENEBRE.Encumbrance.Porter")}"><i class="fas fa-dolly"></i></span>`
    : "";

  const statusHtml = statusText
    ? ` <span class="tenebre-enc-status ${statusClass}">(${statusText})</span>`
    : "";

  return `${loadText}${porterBadge}${statusHtml}`;
}

function injectManeuverPanel(app, html, actor) {
  if (!isPlayerActor(actor)) return;

  const el = getRoot(html);
  if (!el) return;

  const selectionKey = getManeuverSelectionKey(actor);
  const previousSelection = el.querySelector(".tenebre-maneuver-panel .tenebre-maneuver-select")?.value;
  if (previousSelection) selectedManeuversByActor.set(selectionKey, previousSelection);

  el.querySelectorAll(".tenebre-maneuver-panel").forEach((panel) => panel.remove());

  const anchor = el.querySelector(".combat .weapons");
  if (!anchor) return;

  const selectedManeuverId = selectedManeuversByActor.get(selectionKey) ?? ManeuverService.list()[0]?.id;
  const panel = document.createElement("div");
  panel.className = "tenebre-maneuver-panel";
  panel.innerHTML = buildManeuverPanelHtml(selectedManeuverId);
  anchor.classList.add("tenebre-has-maneuvers");

  const maneuverSelect = panel.querySelector(".tenebre-maneuver-select");
  maneuverSelect?.addEventListener("change", () => {
    selectedManeuversByActor.set(selectionKey, maneuverSelect.value);
  });

  for (const button of panel.querySelectorAll(".tenebre-maneuver-roll")) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const select = panel.querySelector(".tenebre-maneuver-select");
      const maneuverId = select?.value;
      if (maneuverId) selectedManeuversByActor.set(selectionKey, maneuverId);
      await ManeuverService.execute(actor, maneuverId, {
        modifier: 0,
        damageValue: 0
      });
    });
  }

  anchor.insertAdjacentElement("afterend", panel);
}

function getManeuverSelectionKey(actor) {
  return actor?.uuid ?? actor?.id ?? actor?.name ?? "unknown";
}

function buildManeuverPanelHtml(selectedManeuverId) {
  const options = ManeuverService.list().map((maneuver) => {
    const label = game.i18n.localize(maneuver.labelKey);
    const selected = maneuver.id === selectedManeuverId ? " selected" : "";
    return `<option value="${maneuver.id}"${selected}>${escapeHtml(label)}</option>`;
  }).join("");

  return `
    <div class="item-list">
      <div class="item-header">
        <b class="name">${game.i18n.localize("TENEBRE.Maneuvers.Title")}</b>
      </div>
      <div class="items">
        <div class="item tenebre-maneuver-row">
          <select class="tenebre-maneuver-select" aria-label="${game.i18n.localize("TENEBRE.Maneuvers.Select")}">
            ${options}
          </select>
          <button type="button" class="tenebre-maneuver-roll">
            <i class="fas fa-dice-d20"></i> ${game.i18n.localize("TENEBRE.Maneuvers.Roll")}
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// Funções auxiliares

function getRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (typeof jQuery !== "undefined" && html instanceof jQuery) return html[0] ?? null;
  if (html?.jquery && html?.[0] instanceof HTMLElement) return html[0];
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function isPlayerActor(actor) {
  return actor?.type === "player";
}

// Hooks do diálogo de rolagem

function onRenderTemplate(path, data, html) {
  if (path && path.includes("systems/symbaroum/template/chat/dialog.hbs")) {
    if (isPlayerActor(game.tenebreResources?.activeWeaponRoll?.actor)) {
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
          const activeRoll = dialog._tenebreWeaponRoll ?? game.tenebreResources?.activeWeaponRoll;
          let chosenAmmo = null;

          if (activeRoll && isPlayerActor(activeRoll.actor)) {
            try {
              chosenAmmo = prepareSelectedAmmoForRoll(el, activeRoll);
            } catch (err) {
              console.error("Tenebre Resources | Error preparing ammo modifiers:", err);
              ui.notifications.error("Error preparing ammo modifiers: " + err.message);
            }

            if (!chosenAmmo) {
              ui.notifications.warn(game.i18n.localize("TENEBRE.Hud.NoEquippedQuiver"));
              throw "Cancelled";
            }
          }

          let result;
          try {
            result = await originalCallback.call(this, htmlParam, event);
          } catch (err) {
            console.error("Tenebre Resources | Error in original roll callback:", err);
            throw err;
          }

          if (activeRoll && isPlayerActor(activeRoll.actor) && chosenAmmo && !activeRoll.consumed) {
            activeRoll.consumed = true;
            await AmmoService.consumeAmmo(activeRoll.actor, chosenAmmo, activeRoll.weapon, activeRoll.ammoType);
          }

          return result;
        };
        dialog.data.buttons.roll.callback._tenebreWrapped = true;
      }
    }
  }

  // Injeta seletor de munição para ataques à distância
  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  if (!activeRoll) return;
  if (!isPlayerActor(activeRoll.actor)) return;
  dialog._tenebreWeaponRoll = activeRoll;

  const damModInput = el.querySelector("input[id^='dammodifier-']");
  if (!damModInput) return;

  const damModDiv = damModInput.closest(".damagemodifier");
  if (!damModDiv) return;

  if (el.querySelector("#tenebre-ammo-select")) return;

  const { actor, ammoType } = activeRoll;
  const quivers = findLoadedQuiverItems(actor, ammoType);

  const selectDiv = document.createElement("div");
  selectDiv.className = "bonus";
  
  const label = document.createElement("label");
  label.setAttribute("for", "tenebre-ammo-select");
  label.innerText = game.i18n.localize("TENEBRE.Ammo.Ammo");

  const select = document.createElement("select");
  select.id = "tenebre-ammo-select";

  if (!quivers.length) {
    const option = document.createElement("option");
    option.value = "";
    option.innerText = game.i18n.localize("TENEBRE.Hud.NoEquippedQuiver");
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
  } else {
    for (const q of quivers) {
      const loaded = getQuiverLoadedAmmo(q);
      for (const entry of loaded) {
        if (entry.quantity > 0) {
          const option = document.createElement("option");
          option.value = `quiver|${q.id}|${entry.name}`;
          option.innerText = `${q.name}: ${entry.name} (${entry.quantity}/12)`;
          select.appendChild(option);
        }
      }
    }
  }

  selectDiv.appendChild(label);
  selectDiv.appendChild(select);

  damModDiv.after(selectDiv);
  updateSelectedAmmoForRoll(el, activeRoll);
  select.addEventListener("change", () => updateSelectedAmmoForRoll(el, activeRoll));

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
  attachAmmoRollButtonCapture(dialog, el, activeRoll);
}

function getDisplayedItemWeight(item) {
  const load = EncumbranceService.getItemLoad(item);
  return load.quantity > 1 && load.totalSlots !== load.slotsPerUnit
    ? load.totalSlots
    : load.slotsPerUnit;
}

function attachAmmoRollButtonCapture(dialog, contentEl, activeRoll) {
  if (!dialog || dialog._tenebreAmmoRollCapturePatched) return;

  const dialogRoot = getRoot(dialog.element) ?? contentEl.closest(".app, .window-app") ?? contentEl;
  const rollButtons = dialogRoot.querySelectorAll(
    'button[data-button="roll"], .dialog-button[data-button="roll"], button.dialog-button'
  );

  for (const button of rollButtons) {
    const buttonKey = button.dataset?.button ?? "";
    const text = normalize(button.textContent || "");
    if (buttonKey !== "roll" && !text.includes("rolar") && !text.includes("roll")) continue;

    button.addEventListener("click", (event) => {
      try {
        prepareSelectedAmmoForRoll(contentEl, activeRoll);
        if (!activeRoll.chosenAmmo) {
          ui.notifications.warn(game.i18n.localize("TENEBRE.Hud.NoEquippedQuiver"));
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return false;
        }
      } catch (err) {
        console.error("Tenebre Resources | Error capturing selected ammo:", err);
      }
    }, { capture: true });
    dialog._tenebreAmmoRollCapturePatched = true;
  }

  if (!dialog._tenebreAmmoRollCapturePatched && (dialog._tenebreAmmoRollCaptureAttempts ?? 0) < 5) {
    dialog._tenebreAmmoRollCaptureAttempts = (dialog._tenebreAmmoRollCaptureAttempts ?? 0) + 1;
    setTimeout(() => attachAmmoRollButtonCapture(dialog, contentEl, activeRoll), 0);
  }
}

function prepareSelectedAmmoForRoll(el, activeRoll) {
  if (!activeRoll) return null;

  const chosenAmmo = getSelectedAmmoFromDialog(el, activeRoll);
  if (!chosenAmmo) return null;

  activeRoll.chosenAmmo = chosenAmmo;
  applyAmmoModifiers(chosenAmmo);
  return chosenAmmo;
}

function updateSelectedAmmoForRoll(el, activeRoll) {
  if (!activeRoll) return null;
  const chosenAmmo = getSelectedAmmoFromDialog(el, activeRoll);
  if (chosenAmmo) activeRoll.chosenAmmo = chosenAmmo;
  return chosenAmmo;
}

function getSelectedAmmoFromDialog(el, activeRoll) {
  const selectedValue = el.querySelector("#tenebre-ammo-select")?.value;
  if (!selectedValue) return null;

  if (selectedValue.startsWith("quiver|")) {
    const [, quiverId, entryName] = selectedValue.split("|");
    const quiver = activeRoll.actor.items.get(quiverId);
    if (!quiver) return null;

    const loaded = getQuiverLoadedAmmo(quiver);
    const entry = loaded.find(e => e.name === entryName || e.id === entryName);
    if (!entry) return null;

    const originalItem = activeRoll.actor.items.find(i => i.name === entry.name && isAmmo(i) && !isQuiver(i));
    return {
      isVirtual: true,
      id: entry.id || (originalItem ? originalItem.id : entryName),
      recoveryKey: originalItem?.id ?? entry.id ?? entryName,
      recoveryItemId: originalItem?.id ?? entry.id ?? entryName,
      recoveryName: entry.name,
      name: entry.name,
      img: entry.img || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
      quiverId: quiver.id,
      loadedEntryId: entry.id || entryName,
      type: "equipment",
      system: originalItem ? foundry.utils.deepClone(originalItem.system) : { description: "" },
      getFlag: (scope, key) => {
        if (originalItem) return originalItem.getFlag(scope, key);
        return undefined;
      }
    };
  }

  return activeRoll.actor.items.get(selectedValue) ?? null;
}

function applyAmmoModifiers(chosenAmmo) {
  const ammoMods = getAmmoModifiers(chosenAmmo);
  const weaponModifiers = game.tenebreResources.activeWeaponModifiers;
  if (!weaponModifiers || ammoMods.length <= 0) return;

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

function onCloseDialog(dialog, html) {
  if (game.tenebreResources?.activeWeaponRoll) {
    setTimeout(() => {
      clearActiveWeaponRoll(dialog._tenebreWeaponRoll);
    }, 100);
  }
}

function clearActiveWeaponRoll(activeRoll) {
  if (!game.tenebreResources) return;
  if (!activeRoll || game.tenebreResources.activeWeaponRoll === activeRoll) {
    game.tenebreResources.activeWeaponRoll = null;
    game.tenebreResources.activeWeaponModifiers = null;
  }
}
