import { FLAG_SCOPE } from "./constants.mjs";
import { actorItems, changeItemQuantity, itemQuantity } from "./item-flags.mjs";
import { escapeHtml, normalize, promptDialog } from "./utils.mjs";

const STORABLE_TYPES = new Set(["equipment", "weapon", "armor", "artifact"]);
const ACCESSIBLE_STATES = new Set(["equipped", "active"]);
const CAMPING_CONTENTS_SEEDED_FLAG = "campingContentsSeeded";
const CONTAINER_EXPANDED_FLAG = "containerExpanded";
let hooksRegistered = false;

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
  "saddlebag",
  "equipamento de acampar",
  "equipamento de acampamento",
  "equipamento de campo",
  "algibeira",
  "jarra de barro",
  "belt pouch",
  "field equipment",
  "camping equipment"
];

const BULKY_CONTAINER_ALIASES = [
  "barril",
  "barrel",
  "bau",
  "baú",
  "bau pequeno",
  "baú pequeno",
  "bau grande",
  "baú grande",
  "chest",
  "small chest",
  "large chest",
  "caixa",
  "caixa decorada",
  "box",
  "decorated box",
  "snuff box",
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

const CAMPING_EQUIPMENT_ALIASES = [
  "equipamento de acampar",
  "equipamento de acampamento",
  "equipamento de campo",
  "field equipment",
  "camping equipment"
];

const DEFAULT_CAMPING_CONTENTS = [
  "Saco de dormir",
  "Frigideira",
  "Lenha",
  "Pederneira e Isqueiro",
  "Corda",
  "Cantil"
];

export class ContainerService {
  static registerHooks() {
    if (hooksRegistered) return;
    hooksRegistered = true;

    Hooks.on("preDeleteItem", (item, options, userId) => {
      if (userId !== game.user?.id) return true;
      return this.canDeleteItem(item);
    });

    Hooks.on("deleteItem", (item, options, userId) => {
      if (userId !== game.user?.id) return;
      this.recoverStoredItemsFromDeletedContainer(item).catch((error) => {
        console.warn("Tenebre Resources | Failed to recover stored items after container deletion.", error);
      });
    });
  }

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

  static canDeleteItem(item) {
    if (!item || !this.isContainer(item)) return true;
    const storedItems = this.getStoredItems(item.parent, item);
    if (!storedItems.length) return true;

    ui.notifications.warn(game.i18n.format("TENEBRE.Containers.CannotDeleteNotEmpty", {
      container: item.name,
      count: storedItems.length
    }));
    return false;
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
    const content = buildStoreDialogContent({ actor, item, containers, quantity });

    const result = await promptDialog({
      title: game.i18n.localize("TENEBRE.Containers.StoreTitle"),
      content,
      okIcon: "fas fa-box",
      width: 360,
      contentClass: "tenebre-container-store-dialog",
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

  static async storeItemInContainerPrompt(actor, item, container) {
    if (!actor || !item || !container) return;
    if (!isAccessibleState(item)) {
      warnInaccessibleState("TENEBRE.Containers.CannotStoreOther");
      return;
    }
    if (!this.canStoreItem(item)) return;
    if (!this.isContainer(container)) return;
    if (!isAccessibleState(container)) {
      warnInaccessibleState("TENEBRE.Containers.CannotStoreInOther");
      return;
    }

    const quantity = getStorableQuantity(item);
    if (quantity <= 1) {
      await this.storeItem(actor, item, container, 1);
      return;
    }

    const content = buildStoreDialogContent({ actor, item, containers: [container], quantity, fixedContainer: true });

    const amount = await promptDialog({
      title: game.i18n.localize("TENEBRE.Containers.StoreTitle"),
      content,
      okIcon: "fas fa-box",
      width: 360,
      contentClass: "tenebre-container-store-dialog",
      callback: (element) => Number(element.querySelector('[name="quantity"]')?.value || quantity)
    });

    if (amount === null) return;
    await this.storeItem(actor, item, container, amount);
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

  static async openContainer(actor, container) {
    return this.toggleContainer(actor, container);
  }

  static async toggleContainer(actor, container) {
    if (!actor || !container) return false;

    const isExpanded = !this.isContainerExpanded(actor, container);
    if (isExpanded) {
      await seedContainerContents(actor, container);
      await container.setFlag(FLAG_SCOPE, CONTAINER_EXPANDED_FLAG, true);
    } else {
      await container.setFlag(FLAG_SCOPE, CONTAINER_EXPANDED_FLAG, false);
    }

    rerenderActorSheets(actor);
    return isExpanded;
  }

  static isContainerExpanded(actor, container) {
    if (!actor || !container) return false;
    return container.getFlag?.(FLAG_SCOPE, CONTAINER_EXPANDED_FLAG) === true;
  }

  static async collapseContainer(actor, container) {
    if (!actor || !container) return false;
    await container.setFlag(FLAG_SCOPE, CONTAINER_EXPANDED_FLAG, false);
    return true;
  }

  static async recoverStoredItemsFromDeletedContainer(container) {
    const actor = container?.parent;
    if (!actor) return 0;

    const storedItems = actorItems(actor).filter((item) => this.getStoredIn(item) === container.id);
    if (!storedItems.length) return 0;

    await restoreStoredItems(actor, storedItems);
    ui.notifications.info(game.i18n.format("TENEBRE.Containers.RecoveredFromDeleted", {
      count: storedItems.length,
      container: container.name
    }));
    rerenderActorSheets(actor);
    return storedItems.length;
  }

  static async recoverOrphanedStoredItems(actor) {
    if (!actor) return 0;
    const orphanedItems = actorItems(actor).filter((item) => {
      const containerId = this.getStoredIn(item);
      return containerId && !actor.items.get(containerId);
    });
    if (!orphanedItems.length) return 0;

    await restoreStoredItems(actor, orphanedItems);
    rerenderActorSheets(actor);
    return orphanedItems.length;
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

function buildStoreDialogContent({ actor, item, containers, quantity, fixedContainer = false }) {
  const itemName = escapeHtml(item.name);
  const itemIcon = `<img class="tenebre-store-inline-icon" src="${escapeHtml(item.img || "icons/svg/item-bag.svg")}" alt="">`;
  const container = containers[0];
  const containerName = escapeHtml(container?.name ?? "");
  const containerInput = fixedContainer && container
    ? `<input type="hidden" name="containerId" value="${escapeHtml(container.id)}">`
    : buildContainerSelect(actor, containers);
  const quantityInput = quantity > 1
    ? `
      <div class="tenebre-store-field">
        <label>${game.i18n.format("TENEBRE.Containers.QuantityWithMax", { max: quantity })}</label>
        <input type="number" name="quantity" value="${quantity}" min="1" max="${quantity}">
      </div>
    `
    : "";

  return `
    <form class="tenebre-store-form">
      <p class="tenebre-store-prompt">${game.i18n.format(fixedContainer ? "TENEBRE.Containers.StorePrompt" : "TENEBRE.Containers.StorePromptGeneric", { item: itemName, icon: itemIcon, container: containerName })}</p>
      ${containerInput}
      ${quantityInput}
    </form>
  `;
}

function buildContainerSelect(actor, containers) {
  const options = containers.map((container) => {
    const storedCount = ContainerService.getStoredItems(actor, container).length;
    return `<option value="${escapeHtml(container.id)}">${escapeHtml(container.name)} (${storedCount})</option>`;
  }).join("");

  return `
    <div class="tenebre-store-field">
      <label>${game.i18n.localize("TENEBRE.Containers.ChooseContainer")}</label>
      <select name="containerId">${options}</select>
    </div>
  `;
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

async function restoreStoredItems(actor, items) {
  const updates = items.map((item) => {
    const preStoredState = item.getFlag(FLAG_SCOPE, "preStoredState") || "equipped";
    return {
      _id: item.id,
      "system.state": preStoredState,
      [`flags.${FLAG_SCOPE}.-=storedIn`]: null,
      [`flags.${FLAG_SCOPE}.-=storedInName`]: null,
      [`flags.${FLAG_SCOPE}.-=preStoredState`]: null
    };
  });

  await actor.updateEmbeddedDocuments("Item", updates, { render: true });
}

async function seedContainerContents(actor, container) {
  if (!isCampingEquipment(container)) return;
  if (container.getFlag?.(FLAG_SCOPE, CAMPING_CONTENTS_SEEDED_FLAG)) return;
  if (ContainerService.getStoredItems(actor, container).length > 0) return;

  const contentRefs = extractCampingContentRefs(container);
  if (!contentRefs.length) return;

  const itemData = [];
  for (const ref of contentRefs) {
    const document = await findReferencedItem(ref);
    itemData.push(createSeededStoredItemData(document, ref, container));
  }

  if (!itemData.length) return;
  await actor.createEmbeddedDocuments("Item", itemData, { render: true });
  await container.setFlag(FLAG_SCOPE, CAMPING_CONTENTS_SEEDED_FLAG, true);
}

function isCampingEquipment(item) {
  return hasAlias(normalize(item?.name), CAMPING_EQUIPMENT_ALIASES);
}

function extractCampingContentRefs(container) {
  const description = String(container?.system?.description ?? "");
  const refs = [];
  const seen = new Set();

  for (const match of description.matchAll(/@UUID\[([^\]]+)\]\{([^}]+)\}/g)) {
    addContentRef(refs, seen, { uuid: match[1], name: match[2] });
  }

  for (const match of description.matchAll(/data-uuid=["']([^"']+)["'][^>]*>(.*?)<\/a>/gims)) {
    addContentRef(refs, seen, { uuid: match[1], name: stripHtml(match[2]) });
  }

  if (!refs.length) {
    for (const name of DEFAULT_CAMPING_CONTENTS) addContentRef(refs, seen, { name });
  }

  return refs;
}

function addContentRef(refs, seen, ref) {
  const name = String(ref.name ?? "").trim();
  if (!name) return;
  const normalizedName = normalize(name);
  if (!DEFAULT_CAMPING_CONTENTS.some((itemName) => normalize(itemName) === normalizedName)) return;
  if (seen.has(normalizedName)) return;
  seen.add(normalizedName);
  refs.push({ ...ref, name });
}

async function findReferencedItem(ref) {
  if (ref.uuid && typeof fromUuid === "function") {
    const document = await fromUuid(ref.uuid);
    if (document?.documentName === "Item") return document;
  }

  const normalizedName = normalize(ref.name);
  return game.items?.find?.((item) => normalize(item.name) === normalizedName) ?? null;
}

function createSeededStoredItemData(document, ref, container) {
  const itemData = document?.toObject?.() ?? {
    name: ref.name,
    type: "equipment",
    img: "icons/svg/item-bag.svg",
    system: {
      number: 1,
      state: "equipped",
      description: ""
    }
  };

  delete itemData._id;
  itemData.system = foundry.utils.deepClone(itemData.system ?? {});
  itemData.system.number = 1;
  itemData.flags = foundry.utils.deepClone(itemData.flags ?? {});
  itemData.flags[FLAG_SCOPE] = {
    ...(itemData.flags[FLAG_SCOPE] ?? {}),
    storedIn: container.id,
    storedInName: container.name,
    preStoredState: itemData.system.state ?? "equipped"
  };
  return itemData;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function hasAlias(normalizedName, aliases) {
  const searchableName = toSearchableText(normalizedName).trim();
  return aliases.some((alias) => {
    const searchableAlias = toSearchableText(alias).trim();
    return Boolean(searchableAlias) && searchableName === searchableAlias;
  });
}

function toSearchableText(value) {
  return ` ${normalize(value).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")} `;
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
