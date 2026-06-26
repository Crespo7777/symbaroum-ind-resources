import { AmmoService } from "./ammo.mjs";
import { actorItems, getQuiverLoadedTotal, isActiveOrEquipped, isQuiver, itemQuantity } from "./item-flags.mjs";
import { TenebreSettings } from "./settings.mjs";

const BREAD_BTN_ID = "tenebre-bread-btn";
const LEFT_HUD_ID = "tenebre-ammo-hud-left";
const RIGHT_HUD_ID = "tenebre-ammo-hud-right";

export class HotbarService {
  static #registered = false;
  static #refreshTimer = null;

  static register() {
    if (this.#registered) return;
    this.#registered = true;

    Hooks.on("renderHotbar", () => this.refreshSoon());
    Hooks.on("renderChatLog", () => this.refreshSoon());
    Hooks.on("createItem", () => this.refreshSoon());
    Hooks.on("updateItem", () => this.refreshSoon());
    Hooks.on("deleteItem", () => this.refreshSoon());
    Hooks.on("updateActor", () => this.refreshSoon());
    Hooks.on("controlToken", () => this.refreshSoon());
    Hooks.on("canvasReady", () => this.refreshSoon());
    window.addEventListener("resize", () => this.refreshSoon());

    this.refreshSoon();
  }

  static refreshSoon() {
    window.clearTimeout(this.#refreshTimer);
    this.#refreshTimer = window.setTimeout(() => this.refresh(), 50);
  }

  static refresh() {
    document.getElementById(BREAD_BTN_ID)?.remove();

    const actor = getHudActor();
    if (!actor || actor.type !== "player") {
      removeHud();
      return;
    }

    const left = getOrCreateHud(LEFT_HUD_ID, "tenebre-ammo-hud tenebre-ammo-hud-left");
    const right = getOrCreateHud(RIGHT_HUD_ID, "tenebre-ammo-hud tenebre-ammo-hud-right");

    renderRecoveryHud(left, actor);
    renderQuiverHud(right, actor);
    positionHud(left, right);
  }
}

function renderRecoveryHud(panel, actor) {
  const hits = AmmoService.getTrackedHits(actor);
  const count = Math.max(0, Number(hits.ammoHit ?? 0) || 0);
  panel.dataset.empty = count > 0 ? "false" : "true";
  panel.innerHTML = "";
  panel.hidden = count <= 0;
  if (count <= 0) return;

  const item = document.createElement("div");
  item.className = "tenebre-ammo-hud-item tenebre-ammo-hud-recover";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.title = game.i18n.format("TENEBRE.Hud.RecoverableTooltip", { count });

  const icon = document.createElement("i");
  icon.className = "fas fa-arrows-rotate";
  item.appendChild(icon);

  const value = document.createElement("strong");
  value.textContent = String(count);
  item.appendChild(value);

  item.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await AmmoService.recover(actor);
    HotbarService.refreshSoon();
  });

  item.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    item.click();
  });

  panel.appendChild(item);
}

function renderQuiverHud(panel, actor) {
  panel.innerHTML = "";

  const quivers = actorItems(actor).filter((item) => {
    return isQuiver(item)
      && itemQuantity(item) > 0
      && isActiveOrEquipped(item);
  });

  panel.dataset.empty = quivers.length > 0 ? "false" : "true";

  if (!quivers.length) {
    const empty = document.createElement("div");
    empty.className = "tenebre-ammo-hud-item";
    empty.title = game.i18n.localize("TENEBRE.Hud.NoEquippedQuiver");
    empty.innerHTML = `<i class="fas fa-box-archive"></i><span class="tenebre-ammo-hud-label">${game.i18n.localize("TENEBRE.Hud.Quivers")}</span><strong>0</strong>`;
    panel.appendChild(empty);
    return;
  }

  for (const quiver of quivers) {
    const loaded = getQuiverLoadedTotal(quiver);
    const item = document.createElement("div");
    item.className = "tenebre-ammo-hud-item tenebre-ammo-hud-quiver";
    item.title = game.i18n.format("TENEBRE.Hud.QuiverTooltip", {
      name: quiver.name,
      loaded
    });

    const img = document.createElement("img");
    img.src = quiver.img || "icons/containers/bags/quiver-leather-tan.webp";
    img.alt = "";
    item.appendChild(img);

    const label = document.createElement("span");
    label.className = "tenebre-ammo-hud-label";
    label.textContent = quiver.name;
    item.appendChild(label);

    const value = document.createElement("strong");
    value.textContent = `${loaded}/12`;
    item.appendChild(value);

    panel.appendChild(item);
  }
}

function getHudActor() {
  const controlledActor = globalThis.canvas?.tokens?.controlled
    ?.map((token) => token.actor)
    ?.find((actor) => actor?.type === "player" && (actor.isOwner || game.user.isGM));
  if (controlledActor) return controlledActor;

  const character = game.user?.character;
  if (character?.type === "player" && (character.isOwner || game.user.isGM)) return character;

  return null;
}

function getOrCreateHud(id, className) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement("section");
    element.id = id;
    element.className = className;
    document.body.appendChild(element);
  }
  return element;
}

function removeHud() {
  document.getElementById(LEFT_HUD_ID)?.remove();
  document.getElementById(RIGHT_HUD_ID)?.remove();
}

function positionHud(left, right) {
  const bottom = 12;
  const playersRect = getPlayersBoundaryRect();
  const hotbarRect = document.getElementById("hotbar")?.getBoundingClientRect();
  const chatRect = getChatBoundaryRect();

  if (playersRect && hotbarRect) {
    const playersRight = Math.max(playersRect.right, 212);
    applyHudPosition(left, playersRight + 8, hotbarRect.left - playersRight - 16, bottom, { hideWhenEmpty: true });
  } else {
    applyHudPosition(left, 212, 360, bottom, { hideWhenEmpty: true });
  }

  if (hotbarRect && chatRect) {
    applyHudPosition(right, hotbarRect.right + 8, chatRect.left - hotbarRect.right - 16, bottom);
  } else {
    applyHudPosition(right, window.innerWidth - 590, 230, bottom);
  }
}

function applyHudPosition(element, left, width, bottom, { hideWhenEmpty = false } = {}) {
  if (hideWhenEmpty && element.dataset.empty === "true") {
    element.hidden = true;
    return;
  }

  const safeWidth = Math.floor(Math.max(0, width));
  element.style.left = `${Math.floor(left)}px`;
  element.style.width = `${safeWidth}px`;
  element.style.bottom = `${bottom}px`;
  element.hidden = safeWidth < 70;
}

function getPlayersBoundaryRect() {
  const players = document.getElementById("players");
  if (!players) return null;

  const elements = [players, ...players.querySelectorAll("*")];
  const visibleRects = elements
    .map((element) => element.getBoundingClientRect?.())
    .filter((rect) => {
      return rect
        && rect.width > 0
        && rect.height > 0
        && rect.left < window.innerWidth * 0.45
        && rect.top > window.innerHeight - 180;
    });

  if (!visibleRects.length) return players.getBoundingClientRect();

  return {
    left: Math.min(...visibleRects.map((rect) => rect.left)),
    right: Math.max(...visibleRects.map((rect) => rect.right)),
    top: Math.min(...visibleRects.map((rect) => rect.top)),
    bottom: Math.max(...visibleRects.map((rect) => rect.bottom)),
    width: 0,
    height: 0
  };
}

function getChatBoundaryRect() {
  const selectors = [
    "#chat-form",
    "#chat-message",
    "#chat .chat-form",
    "#sidebar"
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const rect = element?.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0) return rect;
  }

  return null;
}
