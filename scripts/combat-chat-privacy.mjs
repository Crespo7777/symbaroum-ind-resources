import { MODULE_ID } from "./constants.mjs";
import { combatDamageSummary, effectiveRollValue } from "./combat-chat-utils.mjs";
import { escapeHtml } from "./utils.mjs";

const publishingSplitIds = new Set();

export class CombatChatPrivacyService {
  static register() {
    Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
      this.#prepareSplit(message, userId);
    });
    Hooks.on("createChatMessage", (message) => {
      this.#publishSanitizedCopy(message);
    });
  }

  static #prepareSplit(message, userId) {
    if (userId && game.user?.id && userId !== game.user.id) return;
    if (message?.flags?.[MODULE_ID]?.publicCombat) return;
    if (message?.whisper?.length || message?.blind) return;

    const parsed = parseNativeCombatMessage(message?.content);
    if (!parsed?.targetName || !parsed.rollValue || !parsed.testFormula) return;

    if (isUnambiguouslyPlayerTarget(parsed.targetName)) return;

    const gmIds = allGmIds();
    if (!gmIds.length) return;

    const damage = combatDamageSummary(message, parsed.damageText);
    const publicCombat = {
      attackerName: parsed.attackerName,
      attackerImg: parsed.attackerImg,
      weaponName: parsed.weaponName,
      weaponImg: parsed.weaponImg,
      targetName: parsed.targetName,
      targetImg: parsed.targetImg,
      testFormula: parsed.testFormula,
      rollValue: parsed.rollValue,
      outcomeText: parsed.outcomeText,
      damageFormula: damage.formula,
      damageTotal: Number.isFinite(damage.total) ? damage.total : null
    };
    const flags = deepClone(message.flags ?? {});
    const splitId = createSplitId();
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      fullCombatForGm: true,
      combatSplitId: splitId,
      publicCombatPayload: publicCombat
    };
    message.updateSource({ whisper: gmIds, blind: true, flags });
  }

  static #publishSanitizedCopy(message) {
    const splitId = message?.flags?.[MODULE_ID]?.combatSplitId;
    const publicCombat = message?.flags?.[MODULE_ID]?.publicCombatPayload;
    if (!splitId || !publicCombat) return;
    if (game.user?.id !== responsibleGmId()) return;
    if (publishingSplitIds.has(splitId) || hasPublishedCopy(splitId)) return;

    const create = globalThis.ChatMessage?.implementation?.create?.bind(globalThis.ChatMessage.implementation)
      ?? globalThis.ChatMessage?.create?.bind(globalThis.ChatMessage);
    if (!create) return;

    publishingSplitIds.add(splitId);
    Promise.resolve(create(publicCombatMessageData(message)))
      .catch((error) => {
        console.error(`${MODULE_ID} | Failed to publish sanitized combat message.`, error);
      })
      .finally(() => publishingSplitIds.delete(splitId));
  }
}

function createSplitId() {
  return foundry?.utils?.randomID?.()
    ?? globalThis.crypto?.randomUUID?.()
    ?? `${game.user?.id ?? "user"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function opposedFormula(testText = "") {
  const labels = [...String(testText).matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]*?)\s*:?\s*\(\s*-?\d+\s*\)/g)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
    .slice(0, 2);
  return labels.join(" ← ");
}

function parseNativeCombatMessage(content = "") {
  if (!content || typeof document === "undefined") return null;
  const template = document.createElement("template");
  template.innerHTML = String(content);
  const root = template.content.querySelector(".symbaroum.chat.combat");
  if (!root) return null;

  const intro = cleanText(root.querySelector(".introTxt")?.textContent);
  const attack = intro.match(/^(.+?)\s+(?:ataca com|attacks? with)\s+(.+)$/i);
  if (!attack) return null;

  const targetName = cleanText(root.querySelector(".targetText")?.textContent)
    .replace(/^(?:V[ií]tima|Victim)\s*:\s*/i, "");
  const testText = cleanText(root.querySelector("[data-item-id]")?.textContent);
  const testFormula = opposedFormula(testText);
  const resultText = [...root.querySelectorAll(".finalTxt .tooltip > p")]
    .map((element) => cleanText(element.textContent))
    .filter((text) => /(?:Rolagem|Roll|Result)\s*:?\s*-?\d+/i.test(text))
    .join(" - ");
  const rollValue = effectiveRollValue(resultText);
  const outcomeText = cleanText(root.querySelector("h4")?.textContent);
  const damageText = [...root.querySelectorAll(".finalTxt")]
    .map((element) => cleanText(element.textContent))
    .find((text) => /^(?:Dano|Damage)\s*:/i.test(text)) ?? "";

  return {
    attackerName: cleanText(attack[1]),
    attackerImg: backgroundImageUrl(root.querySelector(".introImg")?.getAttribute("style")),
    weaponName: cleanText(root.querySelector(".subText")?.textContent || attack[2]),
    weaponImg: root.querySelector(".foreground > img")?.getAttribute("src") ?? "",
    targetName,
    targetImg: backgroundImageUrl(root.querySelector(".introImg .introImg")?.getAttribute("style")),
    testFormula,
    rollValue,
    outcomeText,
    damageText
  };
}

function buildPublicCombatContent(data) {
  const portuguese = String(game.i18n?.lang ?? "").toLowerCase().startsWith("pt");
  const attacksWith = portuguese ? "ataca com" : "attacks with";
  const victim = portuguese ? "Vítima" : "Victim";
  const roll = portuguese ? "Rolagem" : "Roll";
  const damageLabel = portuguese ? "Dano causado" : "Damage caused";
  const hitText = data.outcomeText
    || (portuguese
      ? `${data.attackerName} atacou ${data.targetName}`
      : `${data.attackerName} attacked ${data.targetName}`);
  const damage = data.damageFormula
    ? `<p>${damageLabel}: ${escapeHtml(data.damageFormula)}</p>`
    : "";
  const presentationData = [
    ["attacker-img", data.attackerImg],
    ["weapon-img", data.weaponImg],
    ["target-img", data.targetImg]
  ].filter(([, value]) => value)
    .map(([key, value]) => ` data-tenebre-${key}="${escapeHtml(value)}"`)
    .join("");
  return `
    <div class="symbaroum chat combat tenebre-public-combat">
      <div class="foreground"${presentationData}>
        <div class="introImg">
          <div class="introTxt">${escapeHtml(data.attackerName)} ${attacksWith} ${escapeHtml(data.weaponName)}</div>
          <div class="introImg"></div>
        </div>
        <div class="targetText">${victim}: ${escapeHtml(data.targetName)}</div>
        <div class="subText">${escapeHtml(data.weaponName)}</div>
        <div class="finalTxt"><p data-item-id="">${escapeHtml(data.testFormula)}</p></div>
        <div class="finalTxt"><div class="tooltip"><p>${roll}: ${escapeHtml(data.rollValue)}</p></div></div>
        <h4>${escapeHtml(hitText)}</h4>
        ${damage}
      </div>
    </div>
  `;
}

export function publicCombatMessageData(message) {
  const splitId = message?.flags?.[MODULE_ID]?.combatSplitId;
  const publicCombat = message?.flags?.[MODULE_ID]?.publicCombatPayload;
  if (!splitId || !publicCombat) return null;
  return {
    user: message.author?.id ?? message.user?.id ?? game.user?.id,
    speaker: deepClone(message.speaker ?? {}),
    content: buildPublicCombatContent(publicCombat),
    flags: {
      [MODULE_ID]: {
        publicCombat,
        combatSplitSourceId: splitId
      }
    }
  };
}

export function responsibleGmId(users = game.users) {
  return [...(users ?? [])]
    .filter((user) => user.isGM && user.active !== false)
    .map((user) => String(user.id ?? ""))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))[0] ?? "";
}

function allGmIds() {
  return [...(game.users ?? [])]
    .filter((user) => user.isGM)
    .map((user) => user.id)
    .filter(Boolean);
}

function hasPublishedCopy(splitId) {
  return [...(game.messages ?? [])]
    .some((message) => message?.flags?.[MODULE_ID]?.combatSplitSourceId === splitId);
}

function isUnambiguouslyPlayerTarget(name) {
  const wanted = normalizeText(name);
  if (!wanted) return false;
  const matches = [
    ...[...(game.actors ?? [])].filter((actor) => normalizeText(actor.name) === wanted),
    ...(globalThis.canvas?.tokens?.placeables ?? [])
      .map((token) => token.actor)
      .filter((actor) => actor && normalizeText(actor.name) === wanted)
  ];
  const unique = [...new Map(matches.map((actor) => [actor.uuid ?? actor.id, actor])).values()];
  return unique.length > 0 && unique.every((actor) => actor.type === "player");
}

function deepClone(value) {
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function backgroundImageUrl(style = "") {
  const match = String(style).match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return match?.[2] ?? "";
}
