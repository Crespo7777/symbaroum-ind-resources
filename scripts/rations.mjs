import { FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { changeItemQuantity, findRationItems, itemQuantity, sumItemQuantities } from "./item-flags.mjs";

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
    return { quantity, usesRemaining, usesPerUnit, items };
  }

  static async sync(actor) {
    const state = this.getState(actor);
    await actor.setFlag(FLAG_SCOPE, "rations", {
      quantity: state.quantity,
      usesRemaining: state.usesRemaining
    });
    return state;
  }

  static async consumeDay(actor) {
    if (!TenebreSettings.get("enableRations")) return;

    const state = this.getState(actor);
    if (state.quantity <= 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Rations.NoRations"));
      return;
    }

    let nextUsesRemaining = state.usesRemaining;
    let nextQuantity = state.quantity;

    if (state.usesRemaining > 1) {
      nextUsesRemaining = state.usesRemaining - 1;
      await actor.setFlag(FLAG_SCOPE, "rations", {
        quantity: state.quantity,
        usesRemaining: nextUsesRemaining
      });
      ui.notifications.info(game.i18n.format("TENEBRE.Rations.ConsumedUse", { uses: nextUsesRemaining }));
    } else {
      const item = state.items.find((entry) => itemQuantity(entry) > 0);
      if (!item) return;

      await changeItemQuantity(item, -1);
      nextQuantity = Math.max(0, state.quantity - 1);
      nextUsesRemaining = nextQuantity > 0 ? state.usesPerUnit : 0;
      await actor.setFlag(FLAG_SCOPE, "rations", {
        quantity: nextQuantity,
        usesRemaining: nextUsesRemaining
      });
      ui.notifications.info(game.i18n.format("TENEBRE.Rations.ConsumedUnit", { quantity: nextQuantity }));
    }

    await this.#postRationChat(actor, {
      quantity: nextQuantity,
      usesRemaining: nextUsesRemaining,
      usesPerUnit: state.usesPerUnit
    });
  }

  static async #postRationChat(actor, newState) {
    const title = game.i18n.format("TENEBRE.Rations.ChatTitle", { actor: actor.name });
    const content = game.i18n.format("TENEBRE.Rations.ChatContent", {
      uses: newState.usesRemaining,
      max: newState.usesPerUnit,
      quantity: newState.quantity
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
