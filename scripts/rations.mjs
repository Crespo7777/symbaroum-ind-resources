import { FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { changeItemQuantity, findRationItems, itemQuantity, sumItemQuantities } from "./item-flags.mjs";
import { SocketService } from "./sockets.mjs";

const pendingConsolidations = new Set();

export class RationService {
  static getState(actor) {
    const usesPerUnit = Math.max(1, Number(TenebreSettings.get("rationUses")) || 7);
    const items = findRationItems(actor);
    const quantity = sumItemQuantities(items);
    const current = actor.getFlag(FLAG_SCOPE, "rations") ?? {};
    let usesRemaining = Number(current.usesRemaining ?? usesPerUnit);
    if (quantity <= 0) usesRemaining = 0;
    if (usesRemaining <= 0 && quantity > 0) usesRemaining = usesPerUnit;
    usesRemaining = Math.min(usesRemaining, usesPerUnit);
    const totalUsesRemaining = quantity > 0 ? ((quantity - 1) * usesPerUnit) + usesRemaining : 0;
    const totalUsesCapacity = quantity * usesPerUnit;
    return { quantity, usesRemaining, usesPerUnit, totalUsesRemaining, totalUsesCapacity, items };
  }

  static async sync(actor) {
    const state = this.getState(actor);
    await actor.setFlag(FLAG_SCOPE, "rations", {
      quantity: state.quantity,
      usesRemaining: state.usesRemaining
    });
    return state;
  }

  static needsConsolidation(actor) {
    return rationStacks(actor).some((items) => items.length > 1);
  }

  static async consolidate(actor) {
    if (!actor || pendingConsolidations.has(actor.uuid ?? actor.id)) return false;

    const stacks = rationStacks(actor).filter((items) => items.length > 1);
    if (!stacks.length) return false;

    const key = actor.uuid ?? actor.id;
    pendingConsolidations.add(key);
    try {
      const updates = [];
      const deleteIds = [];

      for (const items of stacks) {
        const [primary, ...duplicates] = items;
        const quantity = items.reduce((total, item) => total + itemQuantity(item), 0);
        if (quantity <= 0) continue;

        updates.push({ _id: primary.id, "system.number": quantity });
        deleteIds.push(...duplicates.map((item) => item.id));
      }

      if (updates.length) {
        await SocketService.updateEmbeddedDocuments(actor, "Item", updates, { render: false });
      }
      if (deleteIds.length) {
        await SocketService.deleteEmbeddedDocuments(actor, "Item", deleteIds, { render: true });
      }

      await this.sync(actor);
      return Boolean(updates.length || deleteIds.length);
    } finally {
      pendingConsolidations.delete(key);
    }
  }

  static async consumeDay(actor) {
    if (!TenebreSettings.get("enableRations")) return;

    await this.consolidate(actor);

    const state = this.getState(actor);
    if (state.quantity <= 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Rations.NoRations"));
      return;
    }

    const nextTotalUses = Math.max(0, state.totalUsesRemaining - 1);
    const nextQuantity = nextTotalUses > 0 ? Math.ceil(nextTotalUses / state.usesPerUnit) : 0;
    const nextUsesRemaining = currentUnitUses(nextTotalUses, state.usesPerUnit);
    const item = state.items.find((entry) => itemQuantity(entry) > 0);

    if (item && itemQuantity(item) !== nextQuantity) {
      await changeItemQuantity(item, nextQuantity - itemQuantity(item));
    }

    await actor.setFlag(FLAG_SCOPE, "rations", {
      quantity: nextQuantity,
      usesRemaining: nextUsesRemaining
    });

    if (nextQuantity < state.quantity) {
      ui.notifications.info(game.i18n.format("TENEBRE.Rations.ConsumedUnit", { quantity: nextQuantity }));
    } else {
      ui.notifications.info(game.i18n.format("TENEBRE.Rations.ConsumedUse", { uses: nextTotalUses }));
    }

    await this.#postRationChat(actor, {
      quantity: nextQuantity,
      usesRemaining: nextUsesRemaining,
      usesPerUnit: state.usesPerUnit,
      totalUsesRemaining: nextTotalUses,
      totalUsesCapacity: nextQuantity * state.usesPerUnit
    });
  }

  static async #postRationChat(actor, newState) {
    const title = game.i18n.format("TENEBRE.Rations.ChatTitle", { actor: actor.name });
    const content = game.i18n.format("TENEBRE.Rations.ChatContent", {
      uses: newState.usesRemaining,
      max: newState.usesPerUnit,
      quantity: newState.quantity,
      totalUses: newState.totalUsesRemaining,
      totalMax: newState.totalUsesCapacity
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="tenebre-chat-card">
          <div class="tenebre-chat-item">
            <img src="${actor.img}" alt="${actor.name}">
            <div>
              <h3>${title}</h3>
              ${content}
            </div>
          </div>
        </div>
      `
    });
  }
}

function currentUnitUses(totalUses, usesPerUnit) {
  if (totalUses <= 0) return 0;
  return ((totalUses - 1) % usesPerUnit) + 1;
}

function rationStacks(actor) {
  const stacks = new Map();
  for (const item of findRationItems(actor)) {
    if (itemQuantity(item) <= 0) continue;

    const key = item.getFlag(FLAG_SCOPE, "storedIn") || "inventory";

    const stack = stacks.get(key) ?? [];
    stack.push(item);
    stacks.set(key, stack);
  }
  return Array.from(stacks.values());
}
