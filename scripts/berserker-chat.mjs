import { MODULE_ID } from "./constants.mjs";

const BERSERKER_REFERENCE = "berserker";

export class BerserkerChatService {
  static #registered = false;

  static register() {
    if (this.#registered) return;
    this.#registered = true;

    Hooks.on("renderChatMessageHTML", (message, html) => {
      const scope = htmlElement(html);
      if (isEnabled()) enhanceBerserkerCards(scope, message);
      else restoreBerserkerCards(scope);
    });

    Hooks.on(`${MODULE_ID}.settingsChanged`, (key, value) => {
      if (key !== "enableCompactNpcAttackChat") return;
      const scope = htmlElement(globalThis.ui?.chat?.element) ?? globalThis.document;
      restoreBerserkerCards(scope);
      if (value) globalThis.ui?.chat?.render?.({ force: true });
    });
  }
}

export function isBerserkerItem(item) {
  return item?.system?.reference === BERSERKER_REFERENCE;
}

export function enhanceBerserkerCards(scope, message) {
  for (const root of matchingElements(scope, ".symbaroum.chat.ability")) {
    enhanceBerserkerCard(root, message);
  }
}

export function restoreBerserkerCards(scope) {
  for (const root of matchingElements(scope, ".symbaroum.chat.ability[data-tenebre-berserker='true']")) {
    const source = root.querySelector(":scope > .foreground");
    const card = root.querySelector(":scope > .tenebre-berserker-card");
    if (source) source.hidden = false;
    card?.remove();
    root.classList.remove("tenebre-berserker-compact");
    delete root.dataset.tenebreBerserker;
  }
}

function enhanceBerserkerCard(root, message) {
  if (root.dataset.tenebreBerserker === "true") return;

  const source = root.querySelector(":scope > .foreground");
  const abilityCaption = cleanText(source?.querySelector(":scope > .subText")?.textContent);
  const actor = resolveSpeakerActor(message);
  const item = findDisplayedBerserker(actor, abilityCaption);
  if (!source || !actor || !item) return;

  const actorImage = backgroundImageUrl(source.querySelector(":scope > .introImg")?.getAttribute("style")) || actor.img;
  const abilityImage = source.querySelector(":scope > img")?.getAttribute("src") || item.img;
  const introText = cleanText(source.querySelector(":scope > .introImg > .introTxt")?.textContent);
  const actorName = stripParenthetical(actor.name);

  const card = document.createElement("div");
  card.className = "tenebre-berserker-card";
  card.append(createPortrait(actorImage, actorName, "tenebre-berserker-actor"));

  if (introText) {
    card.append(createTextElement("p", "tenebre-berserker-intro", introText));
  }

  card.append(createAbilityFigure(abilityImage, abilityCaption || item.name, item));

  const details = document.createElement("div");
  details.className = "tenebre-berserker-details";
  for (const node of source.querySelectorAll(":scope > .finalTxt")) {
    details.append(node.cloneNode(true));
  }
  if (details.childElementCount) card.append(details);

  source.hidden = true;
  root.append(card);
  root.classList.add("tenebre-berserker-compact");
  root.dataset.tenebreBerserker = "true";
}

function createPortrait(src, name, className) {
  const figure = document.createElement("figure");
  figure.className = className;
  const image = document.createElement("img");
  image.src = src || "icons/svg/mystery-man.svg";
  image.alt = name;
  image.loading = "lazy";
  const caption = document.createElement("figcaption");
  caption.textContent = name;
  figure.append(image, caption);
  return figure;
}

function createAbilityFigure(src, captionText, item) {
  const figure = createPortrait(src, captionText, "tenebre-berserker-ability");
  const caption = figure.querySelector("figcaption");
  caption.textContent = "";

  const link = document.createElement("a");
  link.href = "#";
  link.className = "content-link tenebre-berserker-ability-link";
  link.dataset.uuid = item.uuid;
  link.dataset.type = "Item";
  link.dataset.id = item.id;
  link.textContent = captionText;
  link.title = item.name;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    item.sheet?.render?.({ force: true });
  });
  caption.append(link);
  return figure;
}

function findDisplayedBerserker(actor, abilityCaption) {
  if (!actor || !abilityCaption) return null;
  const items = Array.from(actor.items ?? []).filter(isBerserkerItem);
  if (!items.length) return null;

  const displayedName = normalize(abilityCaption);
  const localizedName = normalize(localize("ABILITY_LABEL.BERSERKER", "Berserker"));
  return items.find((item) => displayedName.startsWith(normalize(item.name)))
    ?? (displayedName.startsWith(localizedName) ? items[0] : null);
}

function resolveSpeakerActor(message) {
  const speaker = message?.speaker ?? {};
  const scene = globalThis.game?.scenes?.get?.(speaker.scene);
  const tokenActor = scene?.tokens?.get?.(speaker.token)?.actor
    ?? globalThis.canvas?.tokens?.get?.(speaker.token)?.actor;
  return tokenActor ?? message?.speakerActor ?? globalThis.game?.actors?.get?.(speaker.actor) ?? null;
}

function matchingElements(scope, selector) {
  const root = htmlElement(scope);
  if (!root) return [];
  const matches = root.matches?.(selector) ? [root] : [];
  return [...matches, ...(root.querySelectorAll?.(selector) ?? [])];
}

function htmlElement(value) {
  return value?.[0] ?? value ?? null;
}

function backgroundImageUrl(style = "") {
  const match = String(style).match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return match?.[2] ?? "";
}

function createTextElement(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

function stripParenthetical(value = "") {
  return cleanText(String(value).replace(/\s*\([^)]*\)/gu, " "));
}

function normalize(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}

function isEnabled() {
  try {
    return game.settings.get(MODULE_ID, "enableCompactNpcAttackChat") !== false;
  } catch (_error) {
    return true;
  }
}
