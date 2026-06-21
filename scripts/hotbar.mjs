import { TenebreSettings } from "./settings.mjs";
import { RationService } from "./rations.mjs";
import { escapeHtml } from "./utils.mjs";

const BREAD_BTN_ID = "tenebre-bread-btn";

// Renderiza o atalho de Pão de Viagem ao lado da barra de macros (hotbar)
export class HotbarService {
  static register() {
    Hooks.on("renderHotbar", HotbarService.#onRenderHotbar);
    Hooks.on("createItem",   HotbarService.#onItemChange);
    Hooks.on("deleteItem",   HotbarService.#onItemChange);
    Hooks.on("updateItem",   HotbarService.#onItemChange);
    Hooks.on("updateActor",  HotbarService.#onActorUpdate);
  }

  static #onRenderHotbar(_app, _html) {
    setTimeout(() => HotbarService.refresh(), 50);
  }

  static #onItemChange(item) {
    if (!HotbarService.#isMyCharacterItem(item?.parent)) return;
    HotbarService.refresh();
  }

  static #onActorUpdate(actor) {
    if (!HotbarService.#isMyCharacter(actor)) return;
    HotbarService.refresh();
  }

  static #isMyCharacter(actor) {
    return actor?.id === game.user?.character?.id;
  }

  static #isMyCharacterItem(actor) {
    return HotbarService.#isMyCharacter(actor);
  }

  // Atualiza ou remove o botão de atalho baseado na quantidade de rações
  static refresh() {
    // Always remove and rebuild to get fresh state
    document.getElementById(BREAD_BTN_ID)?.remove();

    if (!TenebreSettings.get("enableRations")) return;

    const actor = game.user?.character;
    if (!actor || actor.type !== "player") return;

    let state;
    try { state = RationService.getState(actor); } catch { return; }
    if (state.quantity <= 0) return;

    const hotbar = document.getElementById("hotbar");
    if (!hotbar) return;

    const totalUses = state.quantity > 0 ? (state.quantity - 1) * state.usesPerUnit + state.usesRemaining : 0;

    const tooltip = game.i18n.format("TENEBRE.Rations.TooltipFull", {
      quantity: state.quantity,
      uses: totalUses
    });

    const btn = document.createElement("div");
    btn.id = BREAD_BTN_ID;
    btn.className = "tenebre-bread-btn";
    btn.setAttribute("data-tooltip", tooltip);
    btn.setAttribute("data-tooltip-direction", "UP");
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", tooltip);

    btn.innerHTML = `
      <div class="tenebre-bread-inner">
        <i class="fas fa-bread-slice tenebre-bread-icon"></i>
        <span class="tenebre-bread-count">${totalUses}</span>
      </div>
    `;

    btn.addEventListener("click", async () => {
      const a = game.user?.character;
      if (!a) return;
      await RationService.consumeDay(a);
      HotbarService.refresh();
    });

    btn.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") btn.click();
    });

    const parent = hotbar.parentElement ?? document.body;
    parent.insertBefore(btn, hotbar);
  }
}

