import { MODULE_ID } from "./constants.mjs";

const ATTACK_PATTERN = /^(.+?)\s+(?:ataca com|attacks? with)\s+(.+)$/i;
const movedActionsByRoot = new WeakMap();

export class NativeChatPresentationService {
  static register() {
    Hooks.on("renderChatMessageHTML", (_message, html) => {
      const scope = htmlElement(html);
      if (game.settings.get(MODULE_ID, "nativeChatPresentation") === "updated") enhanceNativeAttacks(scope);
      else restoreNativeAttacks(scope);
    });

    Hooks.on(`${MODULE_ID}.settingsChanged`, (key, value) => {
      if (key !== "nativeChatPresentation") return;
      const scope = htmlElement(globalThis.ui?.chat?.element) ?? globalThis.document;
      if (value === "updated") enhanceNativeAttacks(scope);
      else restoreNativeAttacks(scope);
    });
  }
}

export function enhanceNativeAttacks(html) {
  for (const root of matchingElements(html, ".symbaroum.chat.combat")) enhanceNativeAttack(root);
}

export function restoreNativeAttacks(html) {
  for (const root of matchingElements(html, ".symbaroum.chat.combat[data-tenebre-native-attack='true']")) {
    const source = root.querySelector(":scope > .foreground");
    for (const action of movedActionsByRoot.get(root) ?? []) {
      if (!action.node?.isConnected || !source) continue;
      const parent = source.contains(action.parent) ? action.parent : source;
      const nextSibling = action.nextSibling?.parentNode === parent ? action.nextSibling : null;
      parent.insertBefore(action.node, nextSibling);
    }
    movedActionsByRoot.delete(root);
    if (source) source.hidden = false;
    root.querySelector(":scope > .tenebre-native-attack")?.remove();
    root.classList.remove("tenebre-native-combat-updated");
    delete root.dataset.tenebreNativeAttack;
  }
}

export function parseOpposedTest(value = "") {
  const text = cleanText(value);
  const attributes = [...text.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]*?)\s*:?\s*\(\s*(-?\d+)\s*\)/g)]
    .map((match) => ({ label: cleanText(match[1]), value: Number(match[2]) }))
    .slice(0, 2);
  if (!attributes.length) return { text, attributes: [], modifier: 0, objective: null };

  const modifierMatch = text.match(/\bMod(?:ificador|ifier)?\s*:?\s*(-?\d+)/i);
  const modifier = Number(modifierMatch?.[1] ?? 0);
  const objective = attributes.reduce((total, attribute) => total + attribute.value, 0) + modifier;
  return { text, attributes, modifier, objective };
}

function enhanceNativeAttack(root) {
  if (root.dataset.tenebreNativeAttack === "true") return;
  const source = root.querySelector(":scope > .foreground");
  const model = buildAttackModel(source);
  if (!source || !model) return;

  const card = document.createElement("section");
  card.className = "tenebre-native-attack";
  card.append(
    createTextElement("h3", "tenebre-native-attack-title", model.title),
    createAttackFlow(model),
    createAttackSummary(model)
  );

  const actions = collectInteractiveNodes(source).map((node) => ({
    node,
    parent: node.parentNode,
    nextSibling: node.nextSibling
  }));
  if (actions.length) {
    const actionArea = document.createElement("div");
    actionArea.className = "tenebre-native-attack-actions";
    actionArea.append(...actions.map(({ node }) => node));
    card.append(actionArea);
    movedActionsByRoot.set(root, actions);
  }

  source.hidden = true;
  root.classList.add("tenebre-native-combat-updated");
  root.dataset.tenebreNativeAttack = "true";
  root.append(card);
}

function buildAttackModel(source) {
  if (!source) return null;
  const introText = cleanText(source.querySelector(".introTxt")?.textContent);
  const attack = introText.match(ATTACK_PATTERN);
  const targetName = cleanText(source.querySelector(".targetText")?.textContent)
    .replace(/^(?:V[ií]tima|Victim)\s*:\s*/i, "");
  const weaponName = cleanText(source.querySelector(".subText")?.textContent || attack?.[2]);
  const formulaElement = source.querySelector("[data-item-id]");
  const formula = parseOpposedTest(formulaElement?.textContent);
  const firstOutcome = source.querySelector("h4");
  const rollContainer = firstOutcome
    ? [...source.children].find((child) => child.querySelector?.(".tooltip") && (child.compareDocumentPosition(firstOutcome) & 4))
    : null;

  if (!attack || !targetName || !weaponName || !formulaElement || !firstOutcome || !rollContainer) return null;
  return {
    title: introText,
    attacker: {
      name: cleanText(attack[1]),
      img: backgroundImageUrl(source.querySelector(".introImg")?.getAttribute("style"))
        || source.dataset.tenebreAttackerImg
    },
    weapon: {
      name: weaponName,
      img: source.querySelector(":scope > img")?.getAttribute("src")
        || source.dataset.tenebreWeaponImg
    },
    target: {
      name: targetName,
      img: backgroundImageUrl(source.querySelector(".introImg .introImg")?.getAttribute("style"))
        || source.dataset.tenebreTargetImg
    },
    formula,
    formulaElement,
    formulaContainer: formulaElement.closest(".finalTxt"),
    rollContainer,
    source
  };
}

function createAttackFlow(model) {
  const flow = document.createElement("div");
  flow.className = "tenebre-native-attack-flow";
  flow.append(
    createParticipant(model.attacker),
    createTextElement("span", "tenebre-native-attack-arrow", "→"),
    createParticipant(model.weapon),
    createTextElement("span", "tenebre-native-attack-arrow", "→"),
    createParticipant(model.target)
  );
  return flow;
}

function createParticipant(participant) {
  const figure = document.createElement("figure");
  figure.className = "tenebre-native-attack-participant";
  const image = document.createElement("img");
  image.src = participant.img || "icons/svg/mystery-man.svg";
  image.alt = participant.name;
  image.loading = "lazy";
  const caption = document.createElement("figcaption");
  caption.textContent = participant.name;
  figure.append(image, caption);
  return figure;
}

function createAttackSummary(model) {
  const summary = document.createElement("div");
  summary.className = "tenebre-native-attack-summary";
  appendFormula(summary, model.formula);

  const preface = model.formulaContainer?.cloneNode(true);
  preface?.querySelector?.("[data-item-id]")?.remove();
  if (preface && hasVisibleContent(preface)) summary.append(preface);

  for (const sibling of siblingsFrom(model.rollContainer)) {
    const clone = cloneWithoutActions(sibling);
    if (clone && hasVisibleContent(clone)) summary.append(clone);
  }
  return summary;
}

function appendFormula(summary, formula) {
  if (formula.attributes.length >= 2) {
    const [acting, target] = formula.attributes;
    summary.append(createTextElement(
      "p",
      "tenebre-native-attack-formula",
      `${acting.label} (${acting.value}) ← ${target.label} (${target.value})`
    ));
    summary.append(createTextElement(
      "p",
      "tenebre-native-attack-objective",
      `${localize("TENEBRE.NativeChat.Objective", "Objetivo")}: ${formula.objective}`
    ));
    return;
  }
  if (formula.text) summary.append(createTextElement("p", "tenebre-native-attack-formula", formula.text));
}

function* siblingsFrom(element) {
  for (let current = element; current; current = current.nextElementSibling) yield current;
}

function cloneWithoutActions(element) {
  if (element.matches("button, [data-action], #applyEffect")) return null;
  const clone = element.cloneNode(true);
  clone.querySelectorAll?.("button, [data-action], #applyEffect").forEach((node) => node.remove());
  return clone;
}

function hasVisibleContent(element) {
  return Boolean(cleanText(element.textContent) || element.querySelector("img, input, select"));
}

function collectInteractiveNodes(source) {
  const candidates = [...source.querySelectorAll("button, [data-action], #applyEffect")];
  return candidates.filter((element) => !candidates.some((candidate) => candidate !== element && candidate.contains(element)));
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

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function localize(key, fallback) {
  const value = game.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}
