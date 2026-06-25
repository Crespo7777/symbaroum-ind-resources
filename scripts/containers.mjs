import { FLAG_SCOPE } from "./constants.mjs";
import { actorItems, changeItemQuantity, itemQuantity } from "./item-flags.mjs";
import { escapeHtml, normalize } from "./utils.mjs";

const STORABLE_TYPES = new Set(["equipment", "weapon", "armor", "artifact"]);

const LIGHT_CONTAINER_ALIASES = [
  "mochila",
  "backpack",
  "rucksack",
  "saco",
  "sacos",
  "sacola",
  "sacolas",
  "satchel",
  "sack",
  "bolsa",
  "bag",
  "pouch",
  "alforje",
  "alforjes",
  "saddlebag"
];

const BULKY_CONTAINER_ALIASES = [
  "barril",
  "barrel",
  "bau",
  "baú",
  "chest",
  "caixa",
  "box",
  "crate",
  "arca",
  "coffer"
];

export class ContainerService {
  static isContainer(item) {
    if (!item || !STORABLE_TYPES.has(item.type)) return false;
    if (item.getFlag?.(FLAG_SCOPE, "isContainer") === true) return true;
    const name = normalize(item.name);
    return hasAlias(name, LIGHT_CONTAINER_ALIASES) || hasAlias(name, BULKY_CONTAINER_ALIASES);
  }

  static isStored(item) {
    return Boolean(this.getStoredIn(item));
  }

  static getStoredIn(item) {
    return item?.getFlag?.(FLAG_SCOPE, "storedIn") ?? "";
  }

  static canStoreItem(item) {
    return Boolean(
      item
      && STORABLE_TYPES.has(item.type)
      && !this.isContainer(item)
      && !this.isStored(item)
      && item.id !== globalThis.game?.symbaroum?.config?.noArmorID
    );
  }

  static getAvailableContainers(actor, item = null) {
    return actorItems(actor).filter((candidate) => {
      return candidate.id !== item?.id
        && this.isContainer(candidate)
        && !this.isStored(candidate)
        && itemQuantity(candidate) > 0;
    });
  }

  static getStoredItems(actor, container) {
    if (!actor || !container) return [];
    return actorItems(actor).filter((item) => this.getStoredIn(item) === container.id);
  }

  static async storeItemPrompt(actor, item) {
    if (!actor || !item || !this.canStoreItem(item)) return;

    const containers = this.getAvailableContainers(actor, item);
    if (!containers.length) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Containers.NoContainers"));
      return;
    }

    const quantity = getStorableQuantity(item);
    const options = containers.map((container) => {
      const storedCount = this.getStoredItems(actor, container).length;
      return `<option value="${container.id}">${escapeHtml(container.name)} (${storedCount})</option>`;
    }).join("");
    const quantityInput = quantity > 1
      ? `
        <div class="form-group">
          <label>${game.i18n.format("TENEBRE.Containers.QuantityWithMax", { max: quantity })}</label>
          <input type="number" name="quantity" value="${quantity}" min="1" max="${quantity}">
        </div>
      `
      : "";

    const content = `
      <form>
        <p>${game.i18n.format("TENEBRE.Containers.StorePrompt", { item: escapeHtml(item.name) })}</p>
        <div class="form-group">
          <label>${game.i18n.localize("TENEBRE.Containers.Container")}</label>
          <select name="containerId">${options}</select>
        </div>
        ${quantityInput}
      </form>
    `;

    const result = await new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("TENEBRE.Containers.StoreTitle"),
        content,
        buttons: {
          ok: {
            icon: '<i class="fas fa-box"></i>',
            label: game.i18n.localize("TENEBRE.Common.Confirm"),
            callback: (html) => resolve({
              containerId: html.find('[name="containerId"]').val(),
              quantity: Number(html.find('[name="quantity"]').val() || quantity)
            })
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("TENEBRE.Common.Cancel"),
            callback: () => resolve(null)
          }
        },
        default: "ok",
        close: () => resolve(null)
      }).render(true);
    });

    if (!result) return;
    const container = actor.items.get(result.containerId);
    if (!container) return;
    await this.storeItem(actor, item, container, result.quantity);
  }

  static async storeItem(actor, item, container, quantity = 1) {
    const storableQuantity = getStorableQuantity(item);
    const amount = Math.max(1, Math.min(storableQuantity, Math.floor(Number(quantity) || 1)));
    const preStoredState = item.system?.state ?? "";

    if (item.type === "equipment" && storableQuantity > 1 && amount < storableQuantity) {
      const itemData = item.toObject();
      delete itemData._id;
      itemData.system = foundry.utils.deepClone(itemData.system ?? {});
      itemData.system.number = amount;
      itemData.flags = foundry.utils.deepClone(itemData.flags ?? {});
      itemData.flags[FLAG_SCOPE] = {
        ...(itemData.flags[FLAG_SCOPE] ?? {}),
        storedIn: container.id,
        storedInName: container.name,
        preStoredState
      };

      await changeItemQuantity(item, -amount);
      await actor.createEmbeddedDocuments("Item", [itemData], { render: true });
    } else {
      await item.update({
        [`flags.${FLAG_SCOPE}.storedIn`]: container.id,
        [`flags.${FLAG_SCOPE}.storedInName`]: container.name,
        [`flags.${FLAG_SCOPE}.preStoredState`]: preStoredState
      });
    }

    ui.notifications.info(game.i18n.format("TENEBRE.Containers.Stored", {
      item: item.name,
      container: container.name
    }));
  }

  static openContainer(actor, container) {
    if (!actor || !container) return;

    const dialog = new Dialog({
      title: game.i18n.format("TENEBRE.Containers.OpenTitle", { container: container.name }),
      content: this.#buildContainerContent(actor, container),
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("TENEBRE.Common.Cancel")
        }
      },
      render: (html) => {
        html.find("[data-action]").on("click", async (event) => {
          const button = event.currentTarget;
          const itemId = button.closest("[data-item-id]")?.dataset?.itemId;
          const storedItem = actor.items.get(itemId);
          if (!storedItem) return;

          const action = button.dataset.action;
          if (action === "withdraw") {
            await this.withdrawItemPrompt(actor, storedItem);
            dialog.close();
            this.openContainer(actor, container);
          } else if (action === "edit") {
            storedItem.sheet?.render(true);
          } else if (action === "use") {
            await this.useStoredItem(actor, storedItem);
            dialog.close();
            this.openContainer(actor, container);
          }
        });
      }
    });
    dialog.render(true);
  }

  static async withdrawItemPrompt(actor, item) {
    if (!actor || !item || !this.isStored(item)) return;
    const quantity = getStorableQuantity(item);
    if (item.type !== "equipment" || quantity <= 1) {
      await this.withdrawItem(actor, item, quantity);
      return;
    }

    const content = `
      <form>
        <p>${game.i18n.format("TENEBRE.Containers.WithdrawPrompt", { item: escapeHtml(item.name) })}</p>
        <div class="form-group">
          <label>${game.i18n.format("TENEBRE.Containers.QuantityWithMax", { max: quantity })}</label>
          <input type="number" name="quantity" value="${quantity}" min="1" max="${quantity}">
        </div>
      </form>
    `;

    const amount = await new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("TENEBRE.Containers.WithdrawTitle"),
        content,
        buttons: {
          ok: {
            icon: '<i class="fas fa-box-open"></i>',
            label: game.i18n.localize("TENEBRE.Common.Confirm"),
            callback: (html) => resolve(Number(html.find('[name="quantity"]').val() || quantity))
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("TENEBRE.Common.Cancel"),
            callback: () => resolve(null)
          }
        },
        default: "ok",
        close: () => resolve(null)
      }).render(true);
    });

    if (amount === null) return;
    await this.withdrawItem(actor, item, amount);
  }

  static async withdrawItem(actor, item, quantity = null) {
    if (!actor || !item || !this.isStored(item)) return;

    const currentQuantity = getStorableQuantity(item);
    const amount = Math.max(1, Math.min(currentQuantity, Math.floor(Number(quantity ?? currentQuantity) || currentQuantity)));
    const preStoredState = item.getFlag(FLAG_SCOPE, "preStoredState") || "equipped";
    const mergeTarget = findVisibleStack(actor, item);

    if (item.type === "equipment" && amount < currentQuantity) {
      if (mergeTarget) {
        await changeItemQuantity(mergeTarget, amount);
      } else {
        const itemData = item.toObject();
        delete itemData._id;
        itemData.system = foundry.utils.deepClone(itemData.system ?? {});
        itemData.system.number = amount;
        itemData.system.state = preStoredState;
        itemData.flags = foundry.utils.deepClone(itemData.flags ?? {});
        delete itemData.flags[FLAG_SCOPE]?.storedIn;
        delete itemData.flags[FLAG_SCOPE]?.storedInName;
        delete itemData.flags[FLAG_SCOPE]?.preStoredState;
        await actor.createEmbeddedDocuments("Item", [itemData], { render: true });
      }

      await changeItemQuantity(item, -amount);
      return;
    }

    if (mergeTarget && item.type === "equipment") {
      await changeItemQuantity(mergeTarget, itemQuantity(item));
      await actor.deleteEmbeddedDocuments("Item", [item.id], { render: true });
      return;
    }

    await item.update({
      "system.state": preStoredState,
      [`flags.${FLAG_SCOPE}.-=storedIn`]: null,
      [`flags.${FLAG_SCOPE}.-=storedInName`]: null,
      [`flags.${FLAG_SCOPE}.-=preStoredState`]: null
    });
  }

  static async useStoredItem(actor, item) {
    if (!actor || !item) return;
    if (item.type !== "equipment" || itemQuantity(item) <= 0) {
      item.sheet?.render(true);
      return;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="tenebre-chat-card">
          <h3>${game.i18n.format("TENEBRE.Containers.Used", { item: escapeHtml(item.name) })}</h3>
          <div class="tenebre-chat-item">
            <img src="${item.img}" alt="">
            <div>${String(item.system?.description ?? "")}</div>
          </div>
        </div>
      `
    });

    if (itemQuantity(item) > 1) {
      await changeItemQuantity(item, -1);
    } else {
      await actor.deleteEmbeddedDocuments("Item", [item.id], { render: true });
    }
  }

  static #buildContainerContent(actor, container) {
    const storedItems = this.getStoredItems(actor, container);
    if (!storedItems.length) {
      return `<p>${game.i18n.localize("TENEBRE.Containers.Empty")}</p>`;
    }

    const rows = storedItems.map((item) => `
      <li class="tenebre-container-item" data-item-id="${item.id}">
        <img src="${item.img}" alt="">
        <span class="tenebre-container-name">${escapeHtml(item.name)}</span>
        <span class="tenebre-container-qty">${item.type === "equipment" ? itemQuantity(item) : 1}</span>
        <button type="button" data-action="use">${game.i18n.localize("TENEBRE.Containers.Use")}</button>
        <button type="button" data-action="withdraw">${game.i18n.localize("TENEBRE.Containers.Withdraw")}</button>
        <button type="button" data-action="edit">${game.i18n.localize("TENEBRE.Containers.Edit")}</button>
      </li>
    `).join("");

    return `<ol class="tenebre-container-list">${rows}</ol>`;
  }
}

function getStorableQuantity(item) {
  return item?.type === "equipment" ? Math.max(1, itemQuantity(item)) : 1;
}

function findVisibleStack(actor, item) {
  if (item.type !== "equipment") return null;
  return actorItems(actor).find((candidate) => {
    return candidate.id !== item.id
      && candidate.type === item.type
      && candidate.name === item.name
      && !ContainerService.isStored(candidate)
      && !ContainerService.isContainer(candidate);
  });
}

function hasAlias(normalizedName, aliases) {
  const searchableName = toSearchableText(normalizedName);
  return aliases.some((alias) => {
    const searchableAlias = toSearchableText(alias).trim();
    return Boolean(searchableAlias) && searchableName.includes(` ${searchableAlias} `);
  });
}

function toSearchableText(value) {
  return ` ${normalize(value).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")} `;
}
