import { FLAG_SCOPE } from "./constants.mjs";
import { actorItems, changeItemQuantity, itemQuantity } from "./item-flags.mjs";
import { escapeHtml, normalize, promptDialog } from "./utils.mjs";

const STORABLE_TYPES = new Set(["equipment", "weapon", "armor", "artifact"]);
const ACCESSIBLE_STATES = new Set(["equipped", "active"]);
const expandedContainers = new Set();

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
  "cesto",
  "cesta",
  "basket",
  "bolsa",
  "bag",
  "pouch",
  "purse",
  "bolsa de moedas",
  "coin purse",
  "jarro",
  "jarra",
  "pitcher",
  "clay pitcher",
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

const NON_CONTAINER_ALIASES = [
  "saco de dormir",
  "sleeping bag",
  "bedroll",
  "colchonete",
  "one box",
  "one sack",
  "one barrel"
];

export class ContainerService {
  static isContainer(item) {
    if (!item || !STORABLE_TYPES.has(item.type)) return false;
    if (item.getFlag?.(FLAG_SCOPE, "isContainer") === true) return true;
    const name = normalize(item.name);
    if (hasAlias(name, NON_CONTAINER_ALIASES)) return false;
    return hasAlias(name, LIGHT_CONTAINER_ALIASES) || hasAlias(name, BULKY_CONTAINER_ALIASES);
  }

  static isStored(item) {
    return Boolean(this.getStoredIn(item));
  }

  static getStoredIn(item) {
    return item?.getFlag?.(FLAG_SCOPE, "storedIn") ?? "";
  }

  static canStoreItem(item) {
    return this.canAttemptStoreItem(item) && isAccessibleState(item);
  }

  static canAttemptStoreItem(item) {
    return Boolean(
      item
      && STORABLE_TYPES.has(item.type)
      && !this.isContainer(item)
      && !this.isStored(item)
      && item.id !== globalThis.game?.symbaroum?.config?.noArmorID
    );
  }

  static getContainers(actor, item = null) {
    return actorItems(actor).filter((candidate) => {
      return candidate.id !== item?.id
        && this.isContainer(candidate)
        && !this.isStored(candidate)
        && itemQuantity(candidate) > 0;
    });
  }

  static getAvailableContainers(actor, item = null) {
    return this.getContainers(actor, item).filter((candidate) => {
      return isAccessibleState(candidate);
    });
  }

  static getStoredItems(actor, container) {
    if (!actor || !container) return [];
    return actorItems(actor).filter((item) => this.getStoredIn(item) === container.id);
  }

  static async storeItemPrompt(actor, item) {
    if (!actor || !item) return;
    if (!isAccessibleState(item)) {
      warnInaccessibleState("TENEBRE.Containers.CannotStoreOther");
      return;
    }
    if (!this.canStoreItem(item)) return;

    const containers = this.getAvailableContainers(actor, item);
    if (!containers.length) {
      if (this.getContainers(actor, item).length > 0) {
        warnInaccessibleState("TENEBRE.Containers.CannotStoreInOther");
        return;
      }
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

    const result = await promptDialog({
      title: game.i18n.localize("TENEBRE.Containers.StoreTitle"),
      content,
      okIcon: "fas fa-box",
      callback: (element) => ({
        containerId: element.querySelector('[name="containerId"]')?.value,
        quantity: Number(element.querySelector('[name="quantity"]')?.value || quantity)
      })
    });

    if (!result) return;
    const container = actor.items.get(result.containerId);
    if (!container) return;
    await this.storeItem(actor, item, container, result.quantity);
  }

  static async storeItem(actor, item, container, quantity = 1) {
    if (!isAccessibleState(item)) {
      warnInaccessibleState("TENEBRE.Containers.CannotStoreOther");
      return;
    }
    if (!isAccessibleState(container)) {
      warnInaccessibleState("TENEBRE.Containers.CannotStoreInOther");
      return;
    }

    const storableQuantity = getStorableQuantity(item);
    const amount = Math.max(1, Math.min(storableQuantity, Math.floor(Number(quantity) || 1)));
    const preStoredState = item.system?.state ?? "";

    if (item.type === "equipment" && storableQuantity > 1 && amount < storableQuantity) {
      const storedStack = findStoredStack(actor, item, container);
      await changeItemQuantity(item, -amount);
      if (storedStack) {
        await changeItemQuantity(storedStack, amount);
      } else {
        const itemData = createStoredItemData(item, container, amount, preStoredState);
        await actor.createEmbeddedDocuments("Item", [itemData], { render: true });
      }
    } else {
      const storedStack = item.type === "equipment" ? findStoredStack(actor, item, container) : null;
      if (storedStack) {
        await changeItemQuantity(storedStack, itemQuantity(item));
        await actor.deleteEmbeddedDocuments("Item", [item.id], { render: true });
      } else {
        await item.update({
          [`flags.${FLAG_SCOPE}.storedIn`]: container.id,
          [`flags.${FLAG_SCOPE}.storedInName`]: container.name,
          [`flags.${FLAG_SCOPE}.preStoredState`]: preStoredState
        });
      }
    }

    ui.notifications.info(game.i18n.format("TENEBRE.Containers.Stored", {
      item: item.name,
      container: container.name
    }));
    rerenderActorSheets(actor);
  }

  static openContainer(actor, container) {
    return this.toggleContainer(actor, container);
  }

  static toggleContainer(actor, container) {
    if (!actor || !container) return false;

    const key = containerKey(actor, container);
    const isExpanded = !expandedContainers.has(key);
    if (isExpanded) {
      expandedContainers.add(key);
    } else {
      expandedContainers.delete(key);
    }

    rerenderActorSheets(actor);
    return isExpanded;
  }

  static isContainerExpanded(actor, container) {
    if (!actor || !container) return false;
    return expandedContainers.has(containerKey(actor, container));
  }

  static collapseContainer(actor, container) {
    if (!actor || !container) return;
    expandedContainers.delete(containerKey(actor, container));
  }

  static async withdrawItemPrompt(actor, item) {
    if (!actor || !item || !this.isStored(item)) return;
    const container = actor.items.get(this.getStoredIn(item));
    if (!isAccessibleState(container)) {
      warnInaccessibleState("TENEBRE.Containers.CannotWithdrawOther");
      return;
    }

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

    const amount = await promptDialog({
      title: game.i18n.localize("TENEBRE.Containers.WithdrawTitle"),
      content,
      okIcon: "fas fa-box-open",
      callback: (element) => Number(element.querySelector('[name="quantity"]')?.value || quantity)
    });

    if (amount === null) return;
    await this.withdrawItem(actor, item, amount);
  }

  static async withdrawItem(actor, item, quantity = null) {
    if (!actor || !item || !this.isStored(item)) return;
    const container = actor.items.get(this.getStoredIn(item));
    if (!isAccessibleState(container)) {
      warnInaccessibleState("TENEBRE.Containers.CannotWithdrawOther");
      return;
    }

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
}

function getStorableQuantity(item) {
  return item?.type === "equipment" ? Math.max(1, itemQuantity(item)) : 1;
}

function isAccessibleState(item) {
  return ACCESSIBLE_STATES.has(String(item?.system?.state ?? "").toLowerCase());
}

function warnInaccessibleState(key) {
  ui.notifications.warn(game.i18n.localize(key));
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

function findStoredStack(actor, item, container) {
  if (item.type !== "equipment") return null;
  return actorItems(actor).find((candidate) => {
    return candidate.id !== item.id
      && candidate.type === item.type
      && candidate.name === item.name
      && ContainerService.getStoredIn(candidate) === container.id
      && !ContainerService.isContainer(candidate);
  });
}

function createStoredItemData(item, container, quantity, preStoredState) {
  const itemData = item.toObject();
  delete itemData._id;
  itemData.system = foundry.utils.deepClone(itemData.system ?? {});
  itemData.system.number = quantity;
  itemData.flags = foundry.utils.deepClone(itemData.flags ?? {});
  itemData.flags[FLAG_SCOPE] = {
    ...(itemData.flags[FLAG_SCOPE] ?? {}),
    storedIn: container.id,
    storedInName: container.name,
    preStoredState
  };
  return itemData;
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

function containerKey(actor, container) {
  return `${actor.uuid ?? actor.id}:${container.id}`;
}

function rerenderActorSheets(actor) {
  if (!actor || !globalThis.ui?.windows) return;
  for (const app of Object.values(ui.windows)) {
    const sheetActor = app.actor ?? app.document;
    if (sheetActor?.id === actor.id && typeof app.render === "function") {
      app.render(false);
    }
  }
}
