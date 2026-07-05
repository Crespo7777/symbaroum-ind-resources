import { MODULE_ID } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { escapeHtml } from "./utils.mjs";

const UNKNOWN_IMAGE_PARTS = ["/unknown", "icons/svg/mystery-man"];
const SYSTEM_CARD_IMAGE = "systems/symbaroum/asset/image/artifact.png";
const HUNGER_IMAGE = `modules/${MODULE_ID}/assets/icons/hunger.svg`;
const MODERN_CHAT_FLAVOR_PATH = `modules/${MODULE_ID}/data/modern-chat-flavor.json`;
const LEVEL_NAMES = {
  novice: /^(Novato|Novice)$/i,
  adept: /^(Adepto|Adept)$/i,
  master: /^(Mestre|Master)$/i
};
let modernChatFlavorConfig = defaultModernChatFlavorConfig();

const MANEUVER_IMAGE_BY_TITLE = {
  "adiar a iniciativa": "icons/svg/clockwork.svg",
  "delay initiative": "icons/svg/clockwork.svg",
  "agarrar": "systems/symbaroum/asset/image/lasso.png",
  "grapple": "systems/symbaroum/asset/image/lasso.png",
  "desarmar": "systems/symbaroum/asset/image/weapon.png",
  "disarm": "systems/symbaroum/asset/image/weapon.png",
  "encontrao": "icons/svg/falling.svg",
  "knockdown": "icons/svg/falling.svg",
  "investida": "systems/symbaroum/asset/image/fire-dash.svg",
  "charge": "systems/symbaroum/asset/image/fire-dash.svg",
  "mira cuidadosa": "systems/symbaroum/asset/image/arrow-scope.svg",
  "careful aim": "systems/symbaroum/asset/image/arrow-scope.svg",
  "nocaute": "icons/svg/unconscious.svg",
  "knockout": "icons/svg/unconscious.svg",
  "defesa total": "systems/symbaroum/asset/image/surrounded-shield.webp",
  "total defense": "systems/symbaroum/asset/image/surrounded-shield.webp",
  "ofensiva total": "systems/symbaroum/asset/image/dead-eye.svg",
  "total offense": "systems/symbaroum/asset/image/dead-eye.svg",
  "empurrao": "icons/svg/wingfoot.svg",
  "shove": "icons/svg/wingfoot.svg",
  "veneno em armas": "icons/svg/poison.svg",
  "poison weapon": "icons/svg/poison.svg",
  "tomar a iniciativa": "systems/symbaroum/asset/image/orb-direction.svg",
  "take initiative": "systems/symbaroum/asset/image/orb-direction.svg"
};

async function loadModernChatFlavorConfig() {
  try {
    const response = await fetch(MODERN_CHAT_FLAVOR_PATH, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    modernChatFlavorConfig = mergeModernChatFlavorConfig(defaultModernChatFlavorConfig(), await response.json());
  } catch (error) {
    modernChatFlavorConfig = defaultModernChatFlavorConfig();
    console.warn(`${MODULE_ID} | Could not load modern chat flavor config. Using defaults.`, error);
  }
}

function defaultModernChatFlavorConfig() {
  return {
    version: 1,
    languages: {
      "pt-BR": {
        defaults: {
          attack: {
            success: "{actor} atacou {target} com {item}{ammoPhrase} e acertou.",
            failure: "{actor} atacou {target} com {item}{ammoPhrase} e falhou.",
            neutral: "{actor} atacou {target} com {item}{ammoPhrase}."
          },
          maneuver: {
            success: "{actor} executou a Manobra {item}{targetPhrase} e obteve sucesso.",
            failure: "{actor} executou a Manobra {item}{targetPhrase}, porém falhou.",
            neutral: "{actor} executou a Manobra {item}{targetPhrase}."
          },
          ability: {
            success: "{actor} obteve sucesso ao usar {item}.",
            failure: "{actor} falhou ao usar {item}.",
            neutral: "{actor} usou {item}."
          },
          attribute: {
            success: "{actor} realizou um Teste de {item} e obteve sucesso.",
            failure: "{actor} realizou um Teste de {item}, porém falhou.",
            neutral: "{actor} realizou um Teste de {item}."
          },
          ritual: {
            success: "{actor} realizou o ritual {item}.",
            failure: "{actor} falhou ao realizar o ritual {item}.",
            neutral: "{actor} realizou o ritual {item}."
          },
          power: {
            success: "{actor} canalizou {item} com sucesso.",
            failure: "{actor} falhou ao canalizar {item}.",
            neutral: "{actor} usou {item}."
          },
          item: {
            neutral: "{actor} utilizou {item}."
          },
          ammo: {
            success: "{actor} recuperou o projétil.",
            failure: "{actor} perdeu o projétil.",
            neutral: "{actor} administrou munição."
          },
          rest: {
            neutral: "{actor} descansou."
          },
          hunger: {
            success: "{actor} resistiu aos efeitos da fome.",
            failure: "{actor} sofreu os efeitos da fome.",
            neutral: "{actor} enfrentou a fome."
          },
          system: {
            neutral: "O sistema preparou uma ação para o Mestre."
          }
        },
        overrides: {
          "Alquimia": {
            ability: {
              success: "{actor} obteve sucesso em criar um elixir.",
              failure: "{actor} falhou ao criar um elixir.",
              neutral: "{actor} tentou preparar um elixir."
            }
          }
        }
      },
      en: {
        defaults: {
          attack: {
            success: "{actor} attacked {target} with {item}{ammoPhrase} and hit.",
            failure: "{actor} attacked {target} with {item}{ammoPhrase} and failed.",
            neutral: "{actor} attacked {target} with {item}{ammoPhrase}."
          },
          maneuver: {
            success: "{actor} performed the Maneuver {item}{targetPhrase} and succeeded.",
            failure: "{actor} performed the Maneuver {item}{targetPhrase}, but failed.",
            neutral: "{actor} performed the Maneuver {item}{targetPhrase}."
          },
          ability: {
            success: "{actor} succeeded at using {item}.",
            failure: "{actor} failed to use {item}.",
            neutral: "{actor} used {item}."
          },
          attribute: {
            success: "{actor} performed a {item} Test and succeeded.",
            failure: "{actor} performed a {item} Test, but failed.",
            neutral: "{actor} performed a {item} Test."
          },
          ritual: {
            success: "{actor} performed the ritual {item}.",
            failure: "{actor} failed to perform the ritual {item}.",
            neutral: "{actor} performed the ritual {item}."
          },
          power: {
            success: "{actor} channeled {item} successfully.",
            failure: "{actor} failed to channel {item}.",
            neutral: "{actor} used {item}."
          },
          item: {
            neutral: "{actor} used {item}."
          },
          ammo: {
            success: "{actor} recovered the projectile.",
            failure: "{actor} lost the projectile.",
            neutral: "{actor} managed ammunition."
          },
          rest: {
            neutral: "{actor} rested."
          },
          hunger: {
            success: "{actor} resisted the effects of hunger.",
            failure: "{actor} suffered the effects of hunger.",
            neutral: "{actor} faced hunger."
          },
          system: {
            neutral: "The system prepared an action for the Game Master."
          }
        },
        overrides: {
          Alchemy: {
            ability: {
              success: "{actor} succeeded at creating an elixir.",
              failure: "{actor} failed to create an elixir.",
              neutral: "{actor} tried to prepare an elixir."
            }
          }
        }
      }
    }
  };
}

function mergeModernChatFlavorConfig(base, custom) {
  const merged = structuredCloneSafe(base);
  if (!custom || typeof custom !== "object") return merged;
  merged.version = Number(custom.version) || merged.version;
  merged.languages = mergePlainObject(merged.languages, custom.languages);
  return merged;
}

function mergePlainObject(base = {}, custom = {}) {
  const output = structuredCloneSafe(base);
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return output;
  for (const [key, value] of Object.entries(custom)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = mergePlainObject(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function activeModernChatFlavorConfig() {
  const languages = modernChatFlavorConfig?.languages ?? {};
  return languages[activeModernChatFlavorLanguageKey()]
    ?? languages["pt-BR"]
    ?? languages.en
    ?? {};
}

function activeModernChatFlavorLanguageKey() {
  const language = game?.i18n?.lang ?? "pt-BR";
  const languages = modernChatFlavorConfig?.languages ?? {};
  if (languages[language]) return language;
  const shortLanguage = language.split("-")[0];
  if (languages[shortLanguage]) return shortLanguage;
  return languages["pt-BR"] ? "pt-BR" : "en";
}

export class ModernChatService {
  static register() {
    loadModernChatFlavorConfig();
    Hooks.on("renderChatMessageHTML", (message, html) => this.#render(message, html));
  }

  static #render(message, html) {
    try {
      if (!TenebreSettings.get("enableModernChat")) return;
      if (modernChatStyle() === "legacy") return;

      const root = resolveElement(html);
      const content = root?.querySelector?.(".message-content") ?? root;
      if (!content || content.classList?.contains("tenebre-modern-chat") || content.querySelector(".tenebre-modern-chat")) return;

      const source = content;
      const text = normalizeText(extractTextWithNewlines(source));
      if (!text) return;
      if (shouldHideAutomaticAmmoUseMessage(message, source, text)) {
        const chatMessage = root.closest?.(".chat-message") ?? root;
        chatMessage.style.display = "none";
        return;
      }
      if (shouldHideApplyResultsMessage(message)) {
        const chatMessage = root.closest?.(".chat-message") ?? root;
        chatMessage.style.display = "none";
        return;
      }

      const card = buildCombatCard(message, source, text)
        ?? buildAbilityRollCard(message, source, text)
        ?? buildDeathRollCard(message, source, text)
        ?? buildAttributeRollCard(message, source, text)
        ?? buildResistRequestCard(message, source, text)
        ?? buildApplyResultsCard(message, source, text)
        ?? buildSystemMacroCard(message, source, text)
        ?? buildAmmoRecoveryCard(message, source, text)
        ?? buildAmmoReloadCard(message, source, text)
        ?? buildAmmoUseCard(message, source, text)
        ?? buildRationUseCard(message, source, text)
        ?? buildRestCard(message, source, text)
        ?? buildHungerCard(message, source, text)
        ?? buildItemUseCard(message, source, text)
        ?? buildManeuverCard(message, source, text);

      if (!card) return;

      content.replaceChildren(card);
      bindModernChatInteractions(card);
      root.classList.add("tenebre-modern-chat-message");
      compactModernChatHeader(root);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to render modern chat card.`, error);
    }
  }
}

function compactModernChatHeader(root) {
  const chatMessage = root.closest?.(".chat-message") ?? root;
  const header = chatMessage?.querySelector?.(".message-header");
  const sender = header?.querySelector?.(".message-sender");
  if (!header || !sender) return;

  const senderText = cleanName(sender.textContent);
  if (/^(Mensagem do sistema Symbaroum|Symbaroum system message)$/i.test(senderText)) {
    sender.textContent = localize("TENEBRE.ModernChat.SystemShort");
  }

  const whisper = chatMessage.querySelector?.(".whisper-to");
  const target = cleanName((whisper?.textContent ?? "").replace(/^(To|Para)\s*:\s*/i, ""));
  if (target && !header.querySelector(".tenebre-modern-chat-compact-to")) {
    const to = document.createElement("span");
    to.className = "tenebre-modern-chat-compact-to";
    to.textContent = `${localize("TENEBRE.ModernChat.ToShort")}: ${target}`;
    header.append(to);
  }
  if (whisper) whisper.style.display = "none";
}

function buildCombatCard(message, source, text) {
  const roll = rollLineValue(text);
  if (!/\b(ataca com|attacks? with)\b/i.test(text) || !roll) return null;

  const attackMatch = text.match(/^(.+?)\s+(?:ataca com|attacks? with)\s+(.+?)(?:\n|$)/im);
  const weaponName = cleanName(attackMatch?.[2] ?? firstItalicText(source) ?? "");
  const resistanceContext = recentResistContextForCombat(text, weaponName);
  const attackerName = cleanName(resistanceContext?.attackerName || attackMatch?.[1] || source.querySelector(".introTxt")?.innerText?.match(/^(.+?)\s+(?:ataca com|attacks? with)\b/i)?.[1] || message.speaker?.alias);
  const actor = findActorByName(attackerName) ?? speakerActor(message);
  const weaponItem = findActorItemByName(actor, weaponName);
  const ammoName = attackAmmoName(actor, weaponItem);
  const targetName = cleanName(resistanceContext?.targetName || lineValue(text, "Vítima") || lineValue(text, "Victim") || lineValue(source.querySelector(".targetText")?.innerText ?? "", "Vítima") || lineValue(source.querySelector(".targetText")?.innerText ?? "", "Victim") || hitTargetName(text) || "");
  const targetActor = findActorByName(targetName);
  const damage = lineValue(text, "Dano") || lineValue(text, "Damage");
  const damageDisplay = damage ? causedDamageValue(damage, message, actor) : null;
  const resisted = text.match(/(.+?)\s+(?:suporta dano|endures damage)\s*:\s*([^\n]+)/i);
  const protectedByArmor = /\b(est[aá] protegido pela armadura|is protected by armor)\b/i.test(text);
  const appliedDamage = resisted ? cleanName(resisted[2]) : protectedByArmor ? "0" : "";
  const protection = damage ? protectionValue(damage, message, appliedDamage) : "";
  const hit = /\b(acerta|hits?)\b/i.test(text);
  const miss = /\b(erra|miss(?:es)?)\b/i.test(text);
  const critical = criticalState(text, damage);
  const resultKey = critical === "success"
    ? "TENEBRE.ModernChat.CriticalHit"
    : critical === "failure"
      ? "TENEBRE.ModernChat.CriticalFailure"
      : hit
        ? "TENEBRE.ModernChat.Hit"
        : miss
          ? "TENEBRE.ModernChat.Miss"
          : "TENEBRE.ModernChat.Result";

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Attack"),
    title: weaponName || localize("TENEBRE.ModernChat.Attack"),
    icon: "fa-swords",
    narrative: targetName
      ? localizeFormat("TENEBRE.ModernChat.NarrativeAttack", { actor: attackerName, item: weaponName, target: targetName })
      : localizeFormat("TENEBRE.ModernChat.NarrativeAttackNoTarget", { actor: attackerName, item: weaponName }),
    narrativeData: {
      layout: "attack",
      actorName: attackerName,
      actorImg: resistanceContext?.attackerImg || introImageFromSource(source) || actor?.img,
      action: localize("TENEBRE.ModernChat.NarrativeActionUse"),
      itemName: weaponName || localize("TENEBRE.ModernChat.Attack"),
      itemImg: resistanceContext?.weaponImg || weaponItem?.img || mainItemImage(source, [introImageFromSource(source), actor?.img, targetActor?.img]),
      itemUuid: weaponItem?.uuid,
      ammoName,
      targetAction: targetName ? localize("TENEBRE.ModernChat.NarrativeActionAttackTarget") : "",
      targetName,
      targetImg: resistanceContext?.targetImg || targetImageFromSource(source) || targetActor?.img,
      test: findAttributeLine(text),
      rollValue: firstRollValue(roll)
    },
    actors: [
      actorBlock(attackerName, resistanceContext?.attackerImg || introImageFromSource(source) || actor?.img, localize("TENEBRE.ModernChat.Attacker")),
      targetName ? actorBlock(targetName, resistanceContext?.targetImg || targetImageFromSource(source) || targetActor?.img, localize("TENEBRE.ModernChat.Target")) : null
    ],
    image: resistanceContext?.weaponImg || mainItemImage(source, [introImageFromSource(source), actor?.img, targetImageFromSource(source), targetActor?.img]),
    rows: [
      [localize("TENEBRE.ModernChat.Result"), compactResult({ roll, result: localize(resultKey), positive: hit, negative: miss })],
      damageDisplay ? [localize("TENEBRE.ModernChat.Damage"), damageDisplay] : null,
      protection ? [localize("TENEBRE.ModernChat.Protection"), protection] : null,
      appliedDamage !== "" ? [localize("TENEBRE.ModernChat.DamageTaken"), appliedDamage] : null
    ],
    outcome: hit ? "success" : miss ? "failure" : ""
  });
}

function buildAbilityRollCard(message, source, text) {
  const usesRollPattern = /\b(tenta usar|tries to use)\b/i;
  if (!usesRollPattern.test(text) || !/(Resultado|Result|Rolagem|Roll)/i.test(text)) return null;

  const textActorName = cleanName(text.match(/^(.+?)\s+(tenta usar|tries to use)/im)?.[1] ?? "");
  const actor = speakerActor(message) ?? findActorByName(textActorName);
  const actorName = cleanName(actor?.name || textActorName || message.speaker?.alias);
  const abilityTitleFromUse = text.match(/(?:tenta usar|tries to use)\s+"?\s*([^"\n]+?)\s*"?\s*\./i)?.[1] ?? "";
  const abilityTitleFromCard = findAbilityTitle(source, text);
  const abilityName = stripLevelSuffix(abilityTitleFromUse || abilityTitleFromCard);
  const abilityItem = findChatItem(source, actor, abilityName);
  const abilityLevel = itemLevelFromText(abilityTitleFromCard) || itemLevelFromText(abilityTitleFromUse) || activeItemLevel(abilityItem);
  const effect = itemEffectValue(effectFromItem(abilityItem, abilityLevel));
  const roll = rollLineValue(text);
  const test = findAttributeLine(text);
  const success = /sucesso|succeeds|success/i.test(text) && !/falha|fails/i.test(text);
  const failure = /falha|fails/i.test(text);
  const result = success
    ? localize("TENEBRE.ModernChat.Success")
    : failure
      ? localize("TENEBRE.ModernChat.Failed")
      : localize("TENEBRE.ModernChat.Result");

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Ability"),
    title: abilityName || localize("TENEBRE.ModernChat.Ability"),
    icon: "fa-sparkles",
    narrative: localizeFormat("TENEBRE.ModernChat.NarrativeUse", { actor: actorName, item: abilityName || localize("TENEBRE.ModernChat.Ability") }),
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      action: localize("TENEBRE.ModernChat.NarrativeActionUse"),
      itemName: abilityName || localize("TENEBRE.ModernChat.Ability"),
      itemImg: abilityItem?.img || mainItemImage(source, [actor?.img]),
      itemUuid: abilityItem?.uuid,
      test,
      rollValue: firstRollValue(roll)
    },
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    actorsFirst: true,
    image: mainItemImage(source, [actor?.img]),
    rows: [
      [localize("TENEBRE.ModernChat.Result"), compactResult({ test, roll, result, positive: success, negative: failure })],
      [localize("TENEBRE.ModernChat.Type"), localize("TENEBRE.ModernChat.Ability")],
      effect ? [localize("TENEBRE.ModernChat.Effect"), effect] : null
    ],
    outcome: success ? "success" : failure ? "failure" : ""
  });
}

function buildAttributeRollCard(message, source, text) {
  const rollCard = source.classList?.contains("symbaroum") && source.classList?.contains("roll")
    ? source
    : source.querySelector?.(".symbaroum.chat.roll");
  if (!rollCard) return null;

  const titleLine = cleanName(rollCard.querySelector("h3")?.innerText ?? "");
  const parts = parseIllustratedTestParts(titleLine);
  if (!titleLine || !parts.length) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || message.speaker?.alias || rollCard.querySelector("h3")?.innerText);
  const attributeName = parts[0]?.name || localize("TENEBRE.ModernChat.Test");
  const roll = cleanName(rollCard.querySelector(".symba-rolls.roll.d20")?.innerText
    ?? text.match(/\b(?:Sucesso|Falha|Succeed|Failed|Failure)\s*\(\s*(-?\d+)\s*\)/i)?.[1]
    ?? "");
  const success = Boolean(rollCard.querySelector(".symba-rolls.success")) || /\b(Sucesso|Succeed|Success)\b/i.test(text) && !/\b(Falha|Failed|Failure)\b/i.test(text);
  const failure = Boolean(rollCard.querySelector(".symba-rolls.failure")) || /\b(Falha|Failed|Failure)\b/i.test(text);
  const critical = criticalState(text);
  const resultKey = critical === "success"
    ? "TENEBRE.ModernChat.CriticalHit"
    : critical === "failure"
      ? "TENEBRE.ModernChat.CriticalFailure"
      : success
        ? "TENEBRE.ModernChat.Success"
        : failure
          ? "TENEBRE.ModernChat.Failed"
          : "TENEBRE.ModernChat.Result";
  const linkedItem = attributeRollLinkedItem(rollCard, actor);
  const damage = cleanName(text.match(/(?:Dano|Damage)\s*:?\s*([^\n]+)/i)?.[1] ?? "");
  const protection = cleanName(text.match(/(?:Prote[cç][aã]o|Protection)\s*:?\s*([^\n]+)/i)?.[1] ?? "");
  const isDefenseRoll = ["defesa", "defense"].includes(normalizeComparable(attributeName));

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Test"),
    title: attributeName,
    icon: "fa-dice-d20",
    narrative: localizeFormat("TENEBRE.ModernChat.NarrativeAttribute", { actor: actorName, item: attributeName }),
    narrativeData: {
      layout: "attribute",
      actorName,
      actorImg: actor?.img || rollCard.querySelector("img.portrait")?.getAttribute("src"),
      action: localize("TENEBRE.ModernChat.NarrativeActionTest"),
      itemName: attributeName,
      itemImg: linkedItem?.img || "",
      itemUuid: linkedItem?.uuid,
      test: titleLine,
      hideOpposedTest: true,
      rollValue: roll,
      type: localize("TENEBRE.ModernChat.Test"),
      inlineProtection: failure && isDefenseRoll ? protection : ""
    },
    actors: [actorBlock(actorName, actor?.img || rollCard.querySelector("img.portrait")?.getAttribute("src"), localize("TENEBRE.ModernChat.Attacker"))],
    actorsFirst: true,
    image: linkedItem?.img || rollCard.querySelector("img.portrait")?.getAttribute("src") || actor?.img,
    rows: [
      [localize("TENEBRE.ModernChat.Result"), compactResult({ roll, result: localize(resultKey), positive: success, negative: failure })],
      damage ? [localize("TENEBRE.ModernChat.Damage"), damage] : null,
      protection ? [localize("TENEBRE.ModernChat.Protection"), protection] : null
    ],
    outcome: success ? "success" : failure ? "failure" : ""
  });
}

function buildResistRequestCard(message, source, text) {
  const resistData = symbaroumFlag(message, "resistRoll");
  const hasResistButton = Boolean(source.querySelector("#applyEffect"));
  const parsedRequest = parseResistRequestCard(source, text);
  const isPlayerResistButton = hasResistButton && (Boolean(resistData) || parsedRequest);
  const isNotice = !hasResistButton && isResistNoticeText(text);
  if (!isPlayerResistButton && !isNotice) return null;

  if (isNotice) {
    const fallback = recentAttackContextForResistRequest(message, text);
    const targetName = cleanName(
      fallback?.targetName
      || text.match(/^(.+?)\s+(?:deve clicar|must click)/i)?.[1]
      || ""
    );
    if (!targetName) return null;
    return simpleResistanceNoticeCard({ targetName });
  }

  const attackerActor = resistActor(message, resistData) ?? findActorByName(parsedRequest?.attackerName);
  const attackerName = cleanName(attackerActor?.name || resistData?.actingCharName || parsedRequest?.attackerName || "");
  const targetActor = resistTargetActor(text, resistData) ?? findActorByName(parsedRequest?.targetName);
  const targetName = cleanName(targetActor?.name || resistData?.targetData?.name || parsedRequest?.targetName || "");
  const weapon = resistWeapon(attackerActor, resistData) ?? findActorItemByName(attackerActor, parsedRequest?.weaponName);
  const weaponName = cleanName(resistData?.weapon?.name || weapon?.name || parsedRequest?.weaponName || "");
  if (!attackerName || !targetName || !weaponName) return null;

  const weaponImg = weapon?.img || SYSTEM_CARD_IMAGE;
  rememberResistContext({
    attackerName,
    attackerImg: attackerActor?.img,
    targetName,
    targetImg: targetActor?.img,
    weaponName,
    weaponImg
  });

  const card = simpleResistanceCard({ attackerName, targetName, weaponName });

  const button = source.querySelector("#applyEffect");
  if (button) {
    const actions = document.createElement("div");
    actions.className = "tenebre-modern-chat-actions";
    actions.append(button);
    card.append(actions);
  }

  return card;
}

function simpleResistanceNoticeCard({ targetName }) {
  const card = document.createElement("article");
  card.className = "tenebre-modern-chat tenebre-resistance-simple-card";
  card.innerHTML = `
    <h3>${escapeHtml(localize("TENEBRE.ModernChat.Resistance"))}</h3>
    <div class="tenebre-resistance-simple-lines">
      <p>${escapeHtml(localizeFormat("TENEBRE.ModernChat.ResistNoticeLine", { target: targetName }))}</p>
    </div>
  `;
  return card;
}

function simpleResistanceCard({ attackerName, targetName, weaponName }) {
  const card = document.createElement("article");
  card.className = "tenebre-modern-chat tenebre-resistance-simple-card";
  card.innerHTML = `
    <h3>${escapeHtml(localize("TENEBRE.ModernChat.Resistance"))}</h3>
    <div class="tenebre-resistance-simple-lines">
      <p>${escapeHtml(localizeFormat("TENEBRE.ModernChat.ResistSimpleAttackLine", { actor: attackerName, item: weaponName }))}</p>
      <p>${escapeHtml(localizeFormat("TENEBRE.ModernChat.ResistSimplePromptLine", { target: targetName }))}</p>
    </div>
  `;
  return card;
}

function buildDeathRollCard(message, source, text) {
  const rollCard = source.classList?.contains("symbaroum") && source.classList?.contains("roll")
    ? source
    : source.querySelector?.(".symbaroum.chat.roll");
  if (!rollCard) return null;

  const titleLine = cleanName(rollCard.querySelector("h3")?.innerText ?? "");
  if (!/\b(Rolagem de Morte|Death Roll)\b/i.test(titleLine)) return null;

  const actor = speakerActor(message);
  const nameFromTitle = cleanName(titleLine.match(/(?:para|for)\s+(.+)$/i)?.[1] ?? "");
  const actorName = cleanName(actor?.name || nameFromTitle || message.speaker?.alias);
  const roll = cleanName(text.match(/^\s*(?:Rolagem|Roll)\s*:\s*(-?\d+)/im)?.[1] ?? "");
  const failureCount = cleanName(text.match(/\((\d+)\s*\/\s*3\)/)?.[1] ?? "");
  const healing = cleanName(text.match(/\b(?:Recuperar|Recover)\s+(\d+)/i)?.[1] ?? "");
  const dead = /(último suspiro|last breath|dead|morreu)/i.test(text);
  const criticalSuccess = /\b(Sucesso Crítico|Critical Success)\b/i.test(text);
  const criticalFailure = /\b(Falha Crítica|Critical Failure)\b/i.test(text) || dead;
  const success = criticalSuccess || /\b(permanecer vivo|remain alive|stay alive)\b/i.test(text);
  const failure = criticalFailure || /\b(fim está próximo|near death|end is near)\b/i.test(text);

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Death"),
    title: localize("TENEBRE.ModernChat.DeathRoll"),
    icon: "fa-skull",
    narrativeData: {
      layout: "attribute",
      actorName,
      actorImg: actor?.img,
      illustratedAction: localize("TENEBRE.ModernChat.IllustratedActionTest"),
      itemName: localize("TENEBRE.ModernChat.Death"),
      itemImg: "icons/svg/skull.svg",
      rollValue: roll,
      flavorText: deathRollFlavorText({ actorName, success, failure, criticalSuccess, criticalFailure, healing, failureCount })
    },
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    actorsFirst: true,
    image: "icons/svg/skull.svg",
    rows: [
      [localize("TENEBRE.ModernChat.Test"), { fullRow: true, text: deathRollTestText(message) }]
    ],
    outcome: success ? "success" : failure ? "failure" : ""
  });
}

function buildApplyResultsCard(message, source, text) {
  const applyEffects = symbaroumFlag(message, "applyEffects");
  if (!applyEffects || !game.user?.isGM) return null;

  const button = source.querySelector("#applyEffect");
  if (!button) return null;

  const card = cardShell({
    kind: localize("TENEBRE.ModernChat.System"),
    title: localize("TENEBRE.ModernChat.ApplyResults"),
    icon: "fa-clipboard-check",
    image: SYSTEM_CARD_IMAGE,
    rows: [],
    outcome: ""
  });

  const actions = document.createElement("div");
  actions.className = "tenebre-modern-chat-actions";
  actions.append(button);
  card.append(actions);
  return card;
}

function buildSystemMacroCard(message, source, text) {
  const macro = parseSystemMacroMessage(message, source, text);
  if (!macro) return null;

  const actor = macro.actorName ? findActorByName(macro.actorName) : null;
  return cardShell({
    kind: localize("TENEBRE.ModernChat.Macro"),
    title: macro.title,
    icon: macro.icon || "fa-scroll",
    narrativeData: {
      actorName: macro.actorLabel || macro.actorName || localize("TENEBRE.ModernChat.SystemShort"),
      actorImg: actor?.img,
      illustratedAction: macro.action || localize("TENEBRE.ModernChat.IllustratedActionUse"),
      itemName: macro.itemName || macro.title,
      itemImg: macro.image || SYSTEM_CARD_IMAGE,
      flavorText: macro.flavor
    },
    image: macro.image || SYSTEM_CARD_IMAGE,
    rows: macro.rows ?? [],
    notes: macro.notes ?? [],
    outcome: ""
  });
}

function parseSystemMacroMessage(message, source, text) {
  if (source.querySelector(".symbaroum.chat")) return null;
  const title = cleanName(source.querySelector("h1, h2, h3")?.textContent);
  const alias = cleanName(message?.speaker?.alias);
  const lines = text.split("\n").map(cleanName).filter(Boolean);
  const listItems = [...source.querySelectorAll("li")].map((li) => cleanName(li.textContent)).filter(Boolean);

  const nameCategory = cleanName(text.match(/^Category\s+(.+?)\s+-\s+Names/i)?.[1]);
  if (nameCategory || normalizeComparable(alias) === "name generator") {
    const names = lines.slice(1).filter(Boolean);
    return {
      title: localize("TENEBRE.ModernChat.MacroNameGenerator"),
      actorLabel: localize("TENEBRE.ModernChat.SystemShort"),
      action: localize("TENEBRE.ModernChat.IllustratedActionGenerated"),
      itemName: nameCategory || localize("TENEBRE.ModernChat.Names"),
      image: SYSTEM_CARD_IMAGE,
      icon: "fa-signature",
      rows: nameCategory ? [[localize("TENEBRE.ModernChat.Category"), nameCategory]] : [],
      notes: names,
      flavor: localizeFormat("TENEBRE.ModernChat.MacroNameGeneratorFlavor", { category: nameCategory || localize("TENEBRE.ModernChat.Names") })
    };
  }

  if (isExperienceMacroTitle(title)) {
    const amount = cleanName(text.match(/\b(?:awarded|receberam|obtained|obtiveram|erh[oó]ll|recibido|reçu)\s+(-?\d+)\b/i)?.[1]
      ?? text.match(/\b(-?\d+)\s+(?:de\s+)?(?:experi[eê]ncia|experience|experiencia)\b/i)?.[1]);
    const actorList = listItems.length ? listItems : actorsMentionedAfterLabel(text);
    return {
      title: localize("TENEBRE.ModernChat.MacroAddExperience"),
      actorLabel: localize("TENEBRE.ModernChat.SystemShort"),
      action: localize("TENEBRE.ModernChat.IllustratedActionGranted"),
      itemName: localize("TENEBRE.ModernChat.Experience"),
      image: "icons/svg/upgrade.svg",
      icon: "fa-arrow-up",
      rows: amount ? [[localize("TENEBRE.ModernChat.Experience"), amount]] : [],
      notes: actorList,
      flavor: localizeFormat("TENEBRE.ModernChat.MacroAddExperienceFlavor", {
        actors: actorList.join(", ") || "-",
        amount: amount || "-"
      })
    };
  }

  const rerollMatch = text.match(/^Re-roll for\s+(.+?)\n(.+?)\s+paid\s+1\s+(.+?)\s+for\s+a\s+re-roll/i);
  if (rerollMatch) {
    const actorName = cleanName(rerollMatch[2]);
    const cost = cleanName(rerollMatch[3]);
    return {
      title: localize("TENEBRE.ModernChat.MacroReRoll"),
      actorName,
      action: localize("TENEBRE.ModernChat.IllustratedActionPaid"),
      itemName: cost,
      image: "icons/svg/d20.svg",
      icon: "fa-dice-d20",
      rows: [[localize("TENEBRE.ModernChat.Cost"), cost]],
      flavor: localizeFormat("TENEBRE.ModernChat.MacroReRollFlavor", { actor: actorName || "-", cost })
    };
  }

  if (/temporary corruption was washed away/i.test(title || text)) {
    const actorList = listItems.length ? listItems : actorsMentionedAfterLabel(text);
    return {
      title: localize("TENEBRE.ModernChat.MacroResetTemporaryCorruption"),
      actorLabel: localize("TENEBRE.ModernChat.SystemShort"),
      action: localize("TENEBRE.ModernChat.IllustratedActionReset"),
      itemName: localize("TENEBRE.ModernChat.TemporaryCorruption"),
      image: "icons/svg/aura.svg",
      icon: "fa-droplet-slash",
      notes: actorList,
      flavor: localizeFormat("TENEBRE.ModernChat.MacroResetTemporaryCorruptionFlavor", {
        actors: actorList.join(", ") || "-"
      })
    };
  }

  const createdMatch = text.match(/^Created\s+(.+?)(?:\n|$)/i);
  if (createdMatch || normalizeComparable(alias) === "character importer macro") {
    const actorName = cleanName(createdMatch?.[1]);
    const extra = lines.slice(1).filter(Boolean);
    return {
      title: localize("TENEBRE.ModernChat.MacroCharacterImporter"),
      actorLabel: localize("TENEBRE.ModernChat.SystemShort"),
      action: localize("TENEBRE.ModernChat.IllustratedActionCreated"),
      itemName: actorName || localize("TENEBRE.ModernChat.Actor"),
      image: "icons/svg/mystery-man.svg",
      icon: "fa-file-import",
      notes: extra,
      flavor: localizeFormat("TENEBRE.ModernChat.MacroCharacterImporterFlavor", { actor: actorName || "-" })
    };
  }

  return null;
}

function isExperienceMacroTitle(title) {
  const normalized = normalizeComparable(title);
  return normalized === normalizeComparable(game.i18n.localize("MACRO.ADDEXP_CHANGE"))
    || normalized === "experience change"
    || normalized === "alteracao de experiencia"
    || /\b(experience|experiencia)\b/.test(normalized) && /\b(change|alteracao)\b/.test(normalized);
}

function actorsMentionedAfterLabel(text) {
  const cleaned = cleanName(text);
  const match = cleaned.match(/(?:actors|atores|personagens):\s*(.+?)\s+(?:were|receberam|obtiveram|is now|est[aã]o)/i);
  if (!match) return [];
  return match[1].split(/,\s*|;\s*/).map(cleanName).filter(Boolean);
}

function buildItemUseCard(message, source, text) {
  if (isResistNoticeText(text) || symbaroumFlag(message, "resistRoll") || symbaroumFlag(message, "applyEffects")) return null;

  const symbaroumAbilityCard = source.querySelector(".symbaroum.chat.ability");
  const symbaroumItemCard = source.querySelector(".symbaroum.chat.item");
  const symbaroumCard = symbaroumAbilityCard ?? symbaroumItemCard;
  const isExplicitUse = source.querySelector(".tenebre-chat-item-use") || /\b(usa|uses)\b/i.test(text);
  if (!isExplicitUse && !symbaroumCard) return null;
  if (lineValue(text, "Rolagem") || /Resultado da rolagem/i.test(text)) return null;

  const useMatch = text.match(/^(.+?)\s+(usa|uses)\s+(.+?)(?:\n|$)/im);
  const textActorName = cleanName(useMatch?.[1] ?? "");
  const actor = speakerActor(message) ?? findActorByName(textActorName) ?? findMentionedActor(text);
  const actorName = cleanName(actor?.name || textActorName || message.speaker?.alias);
  const itemName = cleanName(useMatch?.[3] ?? symbaroumCardTitle(symbaroumCard, source, text) ?? "");
  const item = findChatItem(source, actor, itemName);
  const itemLevel = itemLevelFromText(symbaroumCard?.querySelector(".subText")?.innerText ?? text) || activeItemLevel(item);
  const type = cleanName(firstParagraphWithClass(symbaroumCard ?? source, "type") ?? "");
  const kind = symbaroumAbilityCard
    ? localize("TENEBRE.ModernChat.Ability")
    : type || localize("TENEBRE.ModernChat.ItemUse");
  const effect = itemEffectValue(
    effectFromCard(symbaroumCard, itemName, type)
      ?? effectFromItem(item, itemLevel)
  );

  return cardShell({
    kind,
    title: itemName || localize("TENEBRE.ModernChat.ItemUse"),
    icon: "fa-hand-sparkles",
    narrative: narrativeUseText(actorName, itemName || localize("TENEBRE.ModernChat.ItemUse"), type),
    narrativeData: narrativeUseData({
      actorName,
      actorImg: actor?.img,
      itemName: itemName || localize("TENEBRE.ModernChat.ItemUse"),
      itemImg: item?.img || mainItemImage(source, [actor?.img]),
      itemUuid: item?.uuid,
      type
    }),
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    actorsFirst: true,
    image: mainItemImage(source, [actor?.img]),
    rows: [
      [localize("TENEBRE.ModernChat.Type"), type || kind],
      effect ? [localize("TENEBRE.ModernChat.Effect"), effect] : null
    ],
    notes: [],
    outcome: ""
  });
}

function buildAmmoRecoveryCard(message, source, text) {
  const recoveryCard = source.classList?.contains("tenebre-recovery-card")
    ? source
    : source.querySelector?.(".tenebre-recovery-card");
  if (!recoveryCard && !normalizeComparable(text).startsWith("recuperacao de municao")) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || message.speaker?.alias);
  const title = localize("TENEBRE.ModernChat.AmmoRecovery");
  const rollLine = text.split("\n").find((line) => /\b(testa|tests)\b/i.test(line)) ?? "";
  const rollData = parseAmmoRecoveryRoll(rollLine);
  const status = cleanName(text.match(/\b(Recuperado|Quebrado|Recovered|Broken)\b/i)?.[1] ?? "");
  const roll = firstNonHeaderNumber(text, [rollData.threshold]);
  const success = /Recuperado|Recovered/i.test(status);
  const failure = /Quebrado|Broken/i.test(status);
  const ammoImage = findActorItemByName(actor, rollData.ammo)?.img;
  const ammoName = rollData.ammo || title;
  const testText = ammoRecoveryTestText(rollData.threshold);
  const flavorText = ammoRecoveryFlavorText({ actorName, ammoName, success, failure });

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Ammo"),
    title,
    icon: "fa-rotate",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: ammoImage || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      illustratedAction: localize("TENEBRE.ModernChat.IllustratedActionRecover"),
      itemName: ammoName,
      itemImg: ammoImage || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
      rollValue: roll,
      flavorText
    },
    rows: [
      testText ? ["", { fullRow: true, text: testText }] : null
    ],
    outcome: success ? "success" : failure ? "failure" : ""
  });
}

function buildAmmoReloadCard(message, source, text) {
  const reloadCard = source.classList?.contains("tenebre-reload-card")
    ? source
    : source.querySelector?.(".tenebre-reload-card");
  if (!reloadCard && !/\brecarregou muni[cçc][aãa]o\b|\breloaded ammo\b/i.test(text)) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || message.speaker?.alias);
  const itemLine = cleanName(text.split("\n").find((line) => /\d+x\b/i.test(line)) ?? "");
  const ammoMatch = itemLine.match(/(\d+)x\s+(.+?)(?:\s+carregados|\s+loaded|$)/i);
  const quiverMatch = itemLine.match(/(?:no\(a\)|em|into|in)\s+(.+?\(\d+\/\d+\))/i);
  const imgs = chatImages(source, [actor?.img]);
  const ammoName = cleanName(ammoMatch?.[2] ?? "");
  const ammoCount = cleanName(ammoMatch?.[1] ?? "");
  const quiverName = stripTrailingUses(cleanName(quiverMatch?.[1] ?? localize("TENEBRE.ModernChat.Quiver")));
  const ammoImg = imgs[0] || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp";
  const quiverImg = imgs[1] || findActorItemByName(actor, quiverName)?.img || "icons/containers/ammunition/arrows-quiver-black.webp";

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Ammo"),
    title: localize("TENEBRE.ModernChat.AmmoReload"),
    icon: "fa-arrows-rotate",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: ammoImg,
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      action: localize("TENEBRE.ModernChat.NarrativeActionReload"),
      illustratedAction: localize("TENEBRE.ModernChat.IllustratedActionReload"),
      itemName: ammoName,
      itemImg: ammoImg,
      targetName: quiverName,
      targetImg: quiverImg,
      flavorText: localizeFormat("TENEBRE.ModernChat.ReloadFlavor", {
        actor: actorName,
        count: ammoCount,
        ammo: ammoName,
        quiver: quiverName
      })
    },
    rows: [],
    outcome: ""
  });
}

function buildAmmoUseCard(message, source, text) {
  if (!/\butiliza\b/i.test(text) || lineValue(text, "Rolagem") || source.querySelector(".tenebre-recovery-card")) return null;

  const useMatch = text.match(/^(.+?)\s+(?:utiliza|uses)\s+(.+?)(?:\n|$)/im);
  if (!useMatch) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || useMatch[1] || message.speaker?.alias);
  const ammoName = cleanName(useMatch[2]);
  const imgs = chatImages(source, [actor?.img]);
  const description = cleanName(text.split("\n").slice(1).join(" "));

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Ammo"),
    title: ammoName || localize("TENEBRE.ModernChat.Ammo"),
    icon: "fa-location-arrow",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: imgs[0] || findActorItemByName(actor, ammoName)?.img || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
    rows: [],
    notes: description ? [description] : [],
    outcome: ""
  });
}

function buildRationUseCard(message, source, text) {
  if (!/\b(consumiu P[aã]o de Viagem|consumed Travel Bread)\b/i.test(text)) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || text.match(/^(.+?)\s+(?:consumiu P[aã]o de Viagem|consumed Travel Bread)/im)?.[1] || message.speaker?.alias);
  const rationName = game.i18n.localize("TENEBRE.Rations.TravelBread") || "Pão de Viagem";
  const rationItem = findActorItemByName(actor, rationName) ?? findActorItemByName(actor, "Waybread") ?? findActorItemByName(actor, "Pão de Viagem");
  const days = cleanName(text.match(/(?:Dias restantes|Days remaining)\s*:?\s*(\d+\s*\/\s*\d+)/i)?.[1] ?? "").replace(/\s+/g, "");

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Equipment"),
    title: rationItem?.name || rationName,
    icon: "fa-bowl-food",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: rationItem?.img || mainItemImage(source, [actor?.img]) || "icons/consumables/food/bowl-stew-brown.webp",
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      action: localize("TENEBRE.ModernChat.NarrativeActionUse"),
      illustratedAction: localize("TENEBRE.ModernChat.IllustratedActionUse"),
      itemName: rationItem?.name || rationName,
      itemImg: rationItem?.img || mainItemImage(source, [actor?.img]) || "icons/consumables/food/bowl-stew-brown.webp",
      itemUuid: rationItem?.uuid,
      flavorText: localizeFormat("TENEBRE.ModernChat.RationFlavor", {
        actor: actorName,
        item: rationItem?.name || rationName,
        days
      })
    },
    rows: [],
    outcome: ""
  });
}

function buildRestCard(message, source, text) {
  if (!/\bdescansa por\b|\brests for\b/i.test(text)) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || text.match(/^(.+?)\s+(?:descansa por|rests for)/im)?.[1] || message.speaker?.alias);
  const days = cleanName(text.match(/(?:descansa por|rests for)\s+(\d+)/i)?.[1] ?? "");
  const hunger = /Inani[cç][aã]o|Starvation|Fome|Hunger/i.test(text);
  const dead = /morreu por inani[cç][aã]o|died of starvation/i.test(text);
  const failure = /Falhou|Failed/i.test(text);
  const success = hunger && !failure;
  const restName = localize("TENEBRE.ModernChat.Rest");
  const rollValue = hunger ? restStarvationRollValue(text) : "";
  const starvationTest = hunger ? restStarvationTestText(text) : "";

  return cardShell({
    kind: restName,
    title: days ? `${days} ${localize("TENEBRE.ModernChat.Days")}` : localize("TENEBRE.ModernChat.Rest"),
    icon: "fa-bed",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: "",
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      illustratedAction: localize("TENEBRE.ModernChat.IllustratedActionRest"),
      itemName: restName,
      itemImg: "",
      rollValue,
      flavorText: restFlavorText({ actorName, days, hunger, failure, dead })
    },
    rows: [
      starvationTest ? ["", { text: starvationTest, fullRow: true, illustratedClass: "tenebre-illustrated-test-summary" }] : null,
      ...restRows(text, false)
    ],
    notes: hunger ? [] : restNotes(text),
    outcome: dead || failure ? "failure" : success ? "success" : ""
  });
}

function buildHungerCard(message, source, text) {
  const hungerCard = source.classList?.contains("tenebre-hunger-card")
    ? source
    : source.querySelector?.(".tenebre-hunger-card");
  if (!hungerCard && !/\b(Fome|Hunger)\b/i.test(text)) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(actor?.name || message.speaker?.alias);
  const title = cleanName(firstHeadingText(source) || localize("TENEBRE.ModernChat.Hunger"));
  const hungerName = localize("TENEBRE.ModernChat.Hunger");
  const isApplied = /\b(aplicad[oa]|applied)\b/i.test(text) && !/\b(acabou|removed|recuperou|recovered|morreu|death|falhou|failed)\b/i.test(text);
  const isRemoved = /\b(acabou|removed|ended|voltou a se alimentar|eating again)\b/i.test(text);
  const lostStrong = cleanName(text.match(/(?:ainda h[aá]|but)\s+(\d+)\s+(?:ponto|lost strong)/i)?.[1] ?? "");
  const lines = isApplied
    ? []
    : isRemoved
      ? []
    : text.split("\n").map(cleanName).filter((line) => line && line !== title);

  return cardShell({
    kind: hungerName,
    title,
    icon: "fa-drumstick-bite",
    actors: [actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker"))],
    image: HUNGER_IMAGE,
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      illustratedAction: isApplied
        ? localize("TENEBRE.ModernChat.IllustratedActionHas")
        : isRemoved
          ? localize("TENEBRE.ModernChat.IllustratedActionRecovered")
          : localize("TENEBRE.ModernChat.IllustratedActionUse"),
      itemName: hungerName,
      itemImg: HUNGER_IMAGE,
      flavorText: isApplied
        ? localizeFormat("TENEBRE.ModernChat.HungerAppliedFlavor", { actor: actorName })
        : isRemoved
          ? localizeFormat("TENEBRE.ModernChat.HungerRemovedFlavor", { actor: actorName, penalty: lostStrong || "0" })
        : ""
    },
    rows: [],
    notes: lines,
    outcome: /morreu|death|falhou|failed/i.test(text) ? "failure" : /recuperou|recovered|acabou|removed/i.test(text) ? "success" : ""
  });
}

function buildManeuverCard(message, source, text) {
  const maneuverCard = source.classList?.contains("tenebre-maneuver-card")
    ? source
    : source.querySelector?.(".tenebre-maneuver-card");
  if (!maneuverCard) return null;

  const actor = speakerActor(message);
  const actorName = cleanName(lineValue(text, localize("TENEBRE.Maneuvers.Actor")) || actor?.name || message.speaker?.alias);
  const targetName = cleanName(lineValue(text, localize("TENEBRE.Maneuvers.Target")) ?? "");
  const targetActor = findActorByName(targetName);
  const title = cleanName(maneuverCard.querySelector("h3")?.innerText ?? firstHeadingText(maneuverCard) ?? "");
  const success = maneuverCard.classList.contains("tenebre-maneuver-success");
  const failure = maneuverCard.classList.contains("tenebre-maneuver-failure");
  const rows = listRows(maneuverCard);
  const test = rowValue(rows, localize("TENEBRE.Maneuvers.Test"));
  const roll = rowValue(rows, localize("TENEBRE.Maneuvers.Roll"));
  const modifier = rowValue(rows, localize("TENEBRE.Maneuvers.Modifier"));
  const effects = rowValue(rows, localize("TENEBRE.Maneuvers.Effects"));
  const result = rowValue(rows, localize("TENEBRE.Maneuvers.Result"))
    || (success ? localize("TENEBRE.ModernChat.Passed") : failure ? localize("TENEBRE.ModernChat.Failed") : "");
  const hasManeuverResult = Boolean(firstRollValue(roll) || result || success || failure);
  const compactRows = [
    hasManeuverResult ? [localize("TENEBRE.ModernChat.Result"), compactManeuverResult({ test, roll, result, positive: success, negative: failure })] : null,
    shouldShowModifier(modifier) ? [localize("TENEBRE.ModernChat.Modifier"), signedModifier(modifier)] : null,
    effects ? [localize("TENEBRE.ModernChat.Effect"), cleanEffectText(effects)] : null
  ];

  return cardShell({
    kind: localize("TENEBRE.ModernChat.Maneuver"),
    title: title || localize("TENEBRE.ModernChat.Maneuver"),
    icon: maneuverCard.querySelector("h3 i")?.className?.match(/fa-[a-z0-9-]+/i)?.[0] ?? "fa-person-running",
    narrative: targetName
      ? localizeFormat("TENEBRE.ModernChat.NarrativeManeuver", { actor: actorName, item: title || localize("TENEBRE.ModernChat.Maneuver"), target: targetName })
      : localizeFormat("TENEBRE.ModernChat.NarrativeUse", { actor: actorName, item: title || localize("TENEBRE.ModernChat.Maneuver") }),
    narrativeData: {
      actorName,
      actorImg: actor?.img,
      action: localize("TENEBRE.ModernChat.NarrativeActionManeuver"),
      itemName: title || localize("TENEBRE.ModernChat.Maneuver"),
      itemImg: maneuverImage(title),
      targetAction: targetName ? localize("TENEBRE.ModernChat.NarrativeActionAgainst") : "",
      targetName,
      targetImg: targetActor?.img,
      rollValue: firstRollValue(roll),
      showEmptyResultImage: !hasManeuverResult
    },
    image: maneuverImage(title),
    actors: [
      actorBlock(actorName, actor?.img, localize("TENEBRE.ModernChat.Attacker")),
      targetName ? actorBlock(targetName, targetActor?.img, localize("TENEBRE.ModernChat.Target")) : null
    ],
    rows: compactRows,
    outcome: success ? "success" : failure ? "failure" : ""
  });
}

function cardShell({ kind, title, icon, narrative = "", narrativeData = null, actors = [], actorsFirst = false, image = "", rows = [], notes = [], outcome = "" }) {
  const filteredRows = rows.filter(Boolean).filter(([, value]) => rowHasValue(value));
  const filteredNotes = notes.map(cleanName).filter(Boolean);
  return illustratedShell({ kind, title, icon, narrativeData, image, rows: filteredRows, notes: filteredNotes, outcome });
}

function modernChatStyle() {
  return TenebreSettings.get("modernChatStyle") === "legacy" ? "legacy" : "illustrated";
}

function bindModernChatInteractions(card) {
  for (const button of card.querySelectorAll(".tenebre-illustrated-item-link[data-uuid]")) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const uuid = button.dataset.uuid;
      if (!uuid) return;
      try {
        const document = await fromUuid(uuid);
        document?.sheet?.render(true);
      } catch (error) {
        console.warn(`${MODULE_ID} | Could not open illustrated chat item.`, error);
        ui.notifications?.warn(game.i18n.localize("TENEBRE.ChatItemUse.NotAvailable"));
      }
    });
  }
}

function illustratedShell({ kind, title, icon, narrativeData = null, image = "", rows = [], notes = [], outcome = "" }) {
  const data = narrativeData ?? {};
  const isAttack = data.layout === "attack" || normalizeComparable(kind) === normalizeComparable(localize("TENEBRE.ModernChat.Attack"));
  const isAttributeRoll = data.layout === "attribute" || normalizeComparable(kind) === normalizeComparable(localize("TENEBRE.ModernChat.Test"));
  const isManeuver = normalizeComparable(kind) === normalizeComparable(localize("TENEBRE.ModernChat.Maneuver"));
  const typeRow = rowPlainText(rowValue(rows, localize("TENEBRE.ModernChat.Type")));
  const isRitual = /ritual/i.test(typeRow);
  const result = rowValue(rows, localize("TENEBRE.ModernChat.Result"));
  const roll = cleanName(data.rollValue) || firstRollValue(rowPlainText(result));
  const showResultImage = Boolean(roll) || data.showEmptyResultImage;
  const actorName = cleanName(data.actorName);
  const itemName = cleanName(data.itemName || title);
  const targetName = cleanName(data.targetName);
  const actorImg = data.actorImg;
  const itemImg = data.itemImg || image;
  const targetImg = data.targetImg;
  const itemUuid = data.itemUuid;
  const test = cleanName(data.test);
  const action = cleanName(data.illustratedAction) || illustratedAction({ isAttack, isAttributeRoll, isManeuver, isRitual, hasResult: Boolean(result) });
  const resultLabel = illustratedResultLabel({ kind, outcome, result });
  const inlineProtection = cleanName(data.inlineProtection);
  const detailRows = rows
    .filter(([label]) => shouldShowIllustratedDetail(label))
    .filter(([label]) => !(inlineProtection && normalizeComparable(label) === normalizeComparable(localize("TENEBRE.ModernChat.Protection"))));
  const testHtml = illustratedTestHtml(test, { hideOpposed: isAttack || data.hideOpposedTest });
  const flavorText = illustratedFlavorText({ kind, title, outcome, data, typeRow, isAttack, isManeuver, isRitual });
  const detailRowsHtml = isAttack
    ? illustratedAttackDetailsHtml(detailRows)
    : detailRows.length
      ? `<dl>${detailRows.map(([label, value]) => illustratedRowHtml(label, value)).join("")}</dl>`
      : "";
  const article = document.createElement("article");
  article.className = `tenebre-modern-chat tenebre-modern-chat-illustrated ${isAttack ? "tenebre-modern-chat-illustrated-attack" : ""} tenebre-modern-chat-${outcome || "neutral"}`;
  article.innerHTML = `
    <h3 class="tenebre-illustrated-title">${escapeHtml(kind || title)}</h3>
    ${illustratedSeparator()}
    <div class="tenebre-illustrated-stage ${targetName || targetImg ? "tenebre-illustrated-stage-targeted" : ""}">
      ${illustratedPortrait(actorName, actorImg, "fa-user", "tenebre-illustrated-actor")}
      ${isAttack && (targetName || targetImg) ? `<i class="fas fa-arrow-right tenebre-illustrated-attack-arrow tenebre-illustrated-attack-arrow-left"></i>` : ""}
      <div class="tenebre-illustrated-action">
        <span>${escapeHtml(action)}</span>
        <i class="fas fa-arrow-right"></i>
      </div>
      ${illustratedPortrait(itemName, itemImg, icon, "tenebre-illustrated-item", itemUuid)}
      ${isAttack && (targetName || targetImg) ? `<i class="fas fa-arrow-right tenebre-illustrated-attack-arrow tenebre-illustrated-attack-arrow-right"></i>` : ""}
      ${targetName || targetImg ? illustratedPortrait(targetName, targetImg, "fa-user", "tenebre-illustrated-target") : ""}
    </div>
    ${showResultImage || resultLabel ? `
      <div class="tenebre-illustrated-result">
        ${showResultImage ? illustratedD20Html(roll) : ""}
        ${resultLabel ? `<strong>${escapeHtml(resultLabel)}</strong>` : ""}
      </div>
    ` : ""}
    ${flavorText || testHtml || detailRows.length || notes.length ? `
      <div class="tenebre-illustrated-details">
        ${testHtml}
        ${inlineProtection ? illustratedInlineProtectionHtml(inlineProtection) : ""}
        ${detailRowsHtml}
        ${notes.length ? `<ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
        ${flavorText ? `<p class="tenebre-illustrated-flavor">${escapeHtml(flavorText)}</p>` : ""}
      </div>
    ` : ""}
    ${illustratedSeparator()}
  `;
  return article;
}

function illustratedAttackDetailsHtml(rows = []) {
  const lines = rows.map(([label, value]) => {
    const text = rowPlainText(value);
    const line = illustratedAttackDetailLine(label, text);
    return line ? `<p>${escapeHtml(line)}</p>` : "";
  }).filter(Boolean);
  if (!lines.length) return "";
  return `<div class="tenebre-illustrated-attack-details">${lines.join("")}</div>`;
}

function illustratedAttackDetailLine(label, value) {
  const normalized = normalizeComparable(label);
  if (normalized === normalizeComparable(localize("TENEBRE.ModernChat.Damage"))) {
    return localizeFormat("TENEBRE.ModernChat.AttackDamageLine", { value });
  }
  if (normalized === normalizeComparable(localize("TENEBRE.ModernChat.Protection"))) {
    return localizeFormat("TENEBRE.ModernChat.AttackProtectionLine", { value });
  }
  if (normalized === normalizeComparable(localize("TENEBRE.ModernChat.DamageTaken"))) {
    return localizeFormat("TENEBRE.ModernChat.AttackFinalDamageLine", { value });
  }
  if (!value) return "";
  return `${cleanName(label)} ${value}`;
}

function illustratedPortrait(name, img, fallbackIcon = "", extraClass = "", uuid = "") {
  const imageHtml = img && !isUnknownImage(img)
    ? `<img src="${escapeHtml(img)}" alt="">`
    : `<i class="fas ${escapeHtml(fallbackIcon || "fa-diamond")}"></i>`;
  const caption = uuid
    ? `<button type="button" class="tenebre-illustrated-item-link" data-uuid="${escapeHtml(uuid)}">${escapeHtml(name)}</button>`
    : escapeHtml(name);
  return `
    <figure class="tenebre-illustrated-portrait ${escapeHtml(extraClass)}">
      <div>${imageHtml}</div>
      ${name ? `<figcaption>${caption}</figcaption>` : ""}
    </figure>
  `;
}

function illustratedSeparator() {
  return `
    <div class="tenebre-illustrated-separator">
      <img src="modules/${MODULE_ID}/assets/icons/illustrated-separator.png" alt="">
    </div>
  `;
}

function illustratedD20Html(roll) {
  const value = cleanName(roll);
  return `
    <div class="tenebre-illustrated-d20" aria-label="${escapeHtml(value)}">
      <img src="modules/${MODULE_ID}/assets/icons/illustrated-roll-skull.png" alt="">
      ${value ? `<span>${escapeHtml(value)}</span>` : ""}
    </div>
  `;
}

function illustratedRowHtml(label, value) {
  if (value && typeof value === "object" && value.fullRow) {
    const extraClass = cleanName(value.illustratedClass);
    return `<dd class="tenebre-illustrated-row-full ${escapeHtml(extraClass)}">${renderRowValue(value)}</dd>`;
  }
  return `
    <dt>${escapeHtml(label)}</dt>
    <dd>${renderRowValue(value)}</dd>
  `;
}

function shouldShowIllustratedDetail(label) {
  const normalized = normalizeComparable(label);
  return normalized !== normalizeComparable(localize("TENEBRE.ModernChat.Result"))
    && normalized !== normalizeComparable(localize("TENEBRE.ModernChat.Type"))
    && normalized !== normalizeComparable(localize("TENEBRE.ModernChat.Effect"));
}

function illustratedFlavorText({ kind = "", title = "", outcome = "", data = {}, typeRow = "", isAttack = false, isManeuver = false, isRitual = false } = {}) {
  if (data.flavorText) return cleanName(data.flavorText);

  const actor = cleanName(data.actorName);
  const item = cleanName(data.itemName || title || kind);
  if (!actor && !item) return "";

  const target = cleanName(data.targetName);
  const category = modernChatFlavorCategory({ kind, typeRow, data, isAttack, isManeuver, isRitual });
  const template = modernChatFlavorTemplate(category, item, outcome);
  if (!template) return "";

  const languageKey = activeModernChatFlavorLanguageKey();
  const ammo = cleanName(data.ammoName);
  const ammoPhrase = ammo
    ? languageKey.startsWith("en") ? ` using ${ammo}` : ` usando ${ammo}`
    : "";
  const targetPhrase = target
    ? languageKey.startsWith("en") ? ` against ${target}` : ` contra ${target}`
    : "";
  const testParts = parseIllustratedTestParts(data.test);
  const primaryTest = testParts[0] ?? {};
  const opposedTest = testParts[1] ?? {};

  return interpolateModernChatFlavor(template, {
    actor,
    item,
    target,
    targetPhrase,
    kind: cleanName(kind),
    type: cleanName(typeRow),
    result: outcome,
    ammo,
    ammoPhrase,
    attribute: cleanName(primaryTest.name),
    attributeValue: cleanName(primaryTest.value),
    opposedAttribute: cleanName(opposedTest.name),
    opposedValue: cleanName(opposedTest.value)
  });
}

function modernChatFlavorCategory({ kind = "", typeRow = "", data = {}, isAttack = false, isManeuver = false, isRitual = false } = {}) {
  if (data.layout === "attribute") return "attribute";
  if (isAttack) return "attack";
  if (isManeuver) return "maneuver";
  if (isRitual) return "ritual";

  const normalizedKind = normalizeComparable(kind);
  const normalizedType = normalizeComparable(typeRow);
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.Test"))) return "attribute";
  if (/\britual\b/.test(normalizedType)) return "ritual";
  if (/\b(poder|power|mystical)\b/.test(normalizedType)) return "power";
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.Ability"))
    || normalizedType === normalizeComparable(localize("TENEBRE.ModernChat.Ability"))
    || /\b(ability|habilidade)\b/.test(normalizedType)) return "ability";
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.Ammo"))) return "ammo";
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.Rest"))) return "rest";
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.Hunger"))) return "hunger";
  if (normalizedKind === normalizeComparable(localize("TENEBRE.ModernChat.System"))) return "system";
  return "item";
}

function modernChatFlavorTemplate(category, itemName, outcome) {
  const config = activeModernChatFlavorConfig();
  const outcomeKey = outcome === "success" || outcome === "failure" ? outcome : "neutral";
  const normalizedItem = normalizeComparable(itemName);
  const overrides = config.overrides ?? {};

  for (const [overrideName, overrideConfig] of Object.entries(overrides)) {
    if (normalizeComparable(overrideName) !== normalizedItem) continue;
    const categoryConfig = overrideConfig?.[category] ?? overrideConfig?.default;
    const template = categoryConfig?.[outcomeKey] ?? categoryConfig?.neutral;
    if (template) return template;
  }

  const defaults = config.defaults ?? {};
  const categoryConfig = defaults[category] ?? defaults.item;
  return categoryConfig?.[outcomeKey] ?? categoryConfig?.neutral ?? "";
}

function interpolateModernChatFlavor(template, values = {}) {
  return cleanName(String(template ?? "")
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] ?? "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\(\s+\)/g, "")
    .replace(/\s{2,}/g, " "));
}

function illustratedTestHtml(test, { hideOpposed = false } = {}) {
  const parts = parseIllustratedTestParts(test);
  if (!parts.length) return "";
  const left = parts[0];
  const right = hideOpposed ? null : parts[1] ?? null;
  return `
    <div class="tenebre-illustrated-test">
      <span>${escapeHtml(left.value)} em <strong>${escapeHtml(left.name)}</strong></span>
      ${right ? `<span class="tenebre-illustrated-test-separator">←</span><span>${escapeHtml(right.value)} em <strong>${escapeHtml(right.name)}</strong></span>` : ""}
    </div>
  `;
}

function illustratedInlineProtectionHtml(value) {
  return `<p class="tenebre-illustrated-inline-protection">${escapeHtml(localize("TENEBRE.ModernChat.Protection"))} ${escapeHtml(value)}</p>`;
}

function parseIllustratedTestParts(test) {
  const cleaned = cleanName(test);
  if (!cleaned) return [];
  const matches = [...cleaned.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]*?)\s*:?\s*\(\s*(-?\d+)\s*\)/g)]
    .map((match) => ({ name: cleanName(match[1]).replace(/\s+$/, ""), value: cleanName(match[2]) }))
    .filter((part) => part.name && part.value);
  if (matches.length) return matches.slice(0, 2);

  const simple = cleaned.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]*?)\s+(-?\d+)$/);
  return simple ? [{ name: cleanName(simple[1]), value: cleanName(simple[2]) }] : [];
}

function illustratedAction({ isAttack = false, isAttributeRoll = false, isManeuver = false, isRitual = false, hasResult = false } = {}) {
  if (isAttack) return localize("TENEBRE.ModernChat.IllustratedActionAttack");
  if (isAttributeRoll) return localize("TENEBRE.ModernChat.IllustratedActionTest");
  if (isManeuver) return localize("TENEBRE.ModernChat.IllustratedActionManeuver");
  if (isRitual) return localize("TENEBRE.ModernChat.IllustratedActionRitual");
  return hasResult
    ? localize("TENEBRE.ModernChat.IllustratedActionTry")
    : localize("TENEBRE.ModernChat.IllustratedActionUse");
}

function illustratedResultLabel({ kind = "", outcome = "", result = "" } = {}) {
  if (!result && !outcome) return "";
  if (outcome === "success") {
    return normalizeComparable(kind) === normalizeComparable(localize("TENEBRE.ModernChat.Attack"))
      ? "ACERTOU!"
      : "SUCESSO!";
  }
  if (outcome === "failure") return "FALHOU!";
  const text = rowPlainText(result);
  return cleanName(text.replace(/^-?\d+\s*-\s*/, "")).toUpperCase();
}

function rowPlainText(value) {
  if (value && typeof value === "object") {
    if ("text" in value) return cleanName(value.text);
    if ("html" in value) return cleanName(String(value.html).replace(/<[^>]+>/g, " "));
  }
  return cleanName(value);
}

function rowHtml(label, value) {
  if (value && typeof value === "object" && value.fullRow) {
    return `<dd class="tenebre-modern-chat-row-full">${renderRowValue(value)}</dd>`;
  }
  const resultClass = normalizeComparable(label) === normalizeComparable(localize("TENEBRE.ModernChat.Result"))
    ? " tenebre-modern-chat-result-value"
    : "";
  return `
    <dt data-label="${escapeHtml(label)}">${escapeHtml(label)}</dt>
    <dd class="${resultClass.trim()}">${renderRowValue(value)}</dd>
  `;
}

function rowHasValue(value) {
  if (value === undefined || value === null) return false;
  if (value && typeof value === "object") {
    if ("html" in value) return cleanName(value.html) !== "";
    if ("text" in value) return cleanName(value.text) !== "";
    return true;
  }
  return String(value).trim() !== "";
}

function actorBlock(name, img, role) {
  return `
    <div class="tenebre-modern-chat-actor">
      ${img && !isUnknownImage(img) ? `<img src="${escapeHtml(img)}" alt="">` : `<i class="fas fa-user"></i>`}
      <div>
        <span>${escapeHtml(role)}</span>
        <strong>${escapeHtml(name || "-")}</strong>
      </div>
    </div>
  `;
}

function narrativeHeaderHtml({ narrative = "", narrativeData = null, fallbackIcon = "", fallbackImage = "" } = {}) {
  const data = narrativeData ?? {};
  const actorName = cleanName(data.actorName);
  const itemName = cleanName(data.itemName);
  const targetName = cleanName(data.targetName);
  const actorImg = data.actorImg;
  const itemImg = data.itemImg || fallbackImage;
  const targetImg = data.targetImg;
  const action = cleanName(data.action);
  const targetAction = cleanName(data.targetAction);

  if (!actorName && !itemName && !targetName && narrative) {
    return `
      <header class="tenebre-modern-chat-narrative-header">
        ${fallbackImage ? `<img class="tenebre-modern-chat-title-img" src="${escapeHtml(fallbackImage)}" alt="">` : `<i class="fas ${escapeHtml(fallbackIcon)}"></i>`}
        <p>${escapeHtml(narrative)}</p>
      </header>
    `;
  }

  if (data.layout === "attack") {
    return `
      <header class="tenebre-modern-chat-narrative-header tenebre-modern-chat-narrative-attack">
        ${actorImg && !isUnknownImage(actorImg) ? `<img class="tenebre-modern-chat-title-img tenebre-modern-chat-narrative-attack-actor-img" src="${escapeHtml(actorImg)}" alt="">` : `<i class="fas fa-user tenebre-modern-chat-narrative-attack-actor-img"></i>`}
        <p class="tenebre-modern-chat-narrative-attack-main">
          ${actorName ? `<strong>${escapeHtml(actorName)}</strong>` : ""}
          ${action ? `<span>${escapeHtml(action)}</span>` : ""}
          ${itemName ? `<strong>${escapeHtml(itemName)}</strong>` : ""}
          ${itemImg && !isUnknownImage(itemImg) ? `<img class="tenebre-modern-chat-title-img tenebre-modern-chat-narrative-inline-img" src="${escapeHtml(itemImg)}" alt="">` : fallbackIcon ? `<i class="fas ${escapeHtml(fallbackIcon)} tenebre-modern-chat-narrative-inline-img"></i>` : ""}
        </p>
        ${targetName || targetAction ? `
          <p class="tenebre-modern-chat-narrative-attack-target-text">
            ${targetAction ? `<span>${escapeHtml(targetAction)}</span>` : ""}
            ${targetName ? `<strong>${escapeHtml(targetName)}</strong>` : ""}
            ${targetImg && !isUnknownImage(targetImg) ? `<img class="tenebre-modern-chat-title-img tenebre-modern-chat-narrative-inline-img" src="${escapeHtml(targetImg)}" alt="">` : targetName ? `<i class="fas fa-user tenebre-modern-chat-narrative-inline-img"></i>` : ""}
          </p>
        ` : ""}
      </header>
    `;
  }

  return `
    <header class="tenebre-modern-chat-narrative-header">
      ${actorImg && !isUnknownImage(actorImg) ? `<img class="tenebre-modern-chat-title-img" src="${escapeHtml(actorImg)}" alt="">` : `<i class="fas fa-user"></i>`}
      <p class="tenebre-modern-chat-narrative-line">
        ${actorName ? `<strong>${escapeHtml(actorName)}</strong>` : ""}
        ${action ? `<span>${escapeHtml(action)}</span>` : ""}
        ${itemName || itemImg ? narrativeEntityHtml(itemName, itemImg, fallbackIcon) : ""}
        ${targetAction ? `<span>${escapeHtml(targetAction)}</span>` : ""}
        ${targetName || targetImg ? narrativeEntityHtml(targetName, targetImg, "fa-user") : ""}
      </p>
    </header>
  `;
}

function narrativeEntityHtml(name, img, fallbackIcon = "", extraClass = "") {
  return `
    <span class="tenebre-modern-chat-narrative-entity ${escapeHtml(extraClass)}">
      ${name ? `<strong>${escapeHtml(name)}</strong>` : ""}
      ${img && !isUnknownImage(img) ? `<img src="${escapeHtml(img)}" alt="">` : fallbackIcon ? `<i class="fas ${escapeHtml(fallbackIcon)}"></i>` : ""}
    </span>
  `;
}

function narrativeUseText(actorName, itemName, type = "") {
  if (/ritual/i.test(type)) {
    return localizeFormat("TENEBRE.ModernChat.NarrativeRitual", { actor: actorName, item: itemName });
  }
  return localizeFormat("TENEBRE.ModernChat.NarrativeUse", { actor: actorName, item: itemName });
}

function narrativeUseData({ actorName, actorImg, itemName, itemImg, itemUuid = "", type = "" } = {}) {
  return {
    actorName,
    actorImg,
    action: /ritual/i.test(type)
      ? localize("TENEBRE.ModernChat.NarrativeActionRitual")
      : localize("TENEBRE.ModernChat.NarrativeActionUse"),
    itemName,
    itemImg,
    itemUuid,
    type
  };
}

function listRows(source) {
  return [...source.querySelectorAll("ul:not(.tenebre-maneuver-notes) li")].map((li) => {
    const text = cleanName(li.innerText);
    const index = text.indexOf(":");
    if (index < 0) return [localize("TENEBRE.ModernChat.Detail"), text];
    return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
  });
}

function compactResult({ test = "", roll = "", result = "", positive = false, negative = false } = {}) {
  const rollValue = firstRollValue(roll);
  const prefix = rollValue ? `${rollValue} - ` : "";
  return `${prefix}${cleanName(result)}`;
}

function compactManeuverResult({ test = "", roll = "", result = "", positive = false, negative = false } = {}) {
  const rollValue = firstRollValue(roll);
  const resultText = maneuverResultText(result, positive, negative);
  return `${rollValue || "-"} - ${resultText}`;
}

function firstRollValue(roll) {
  return cleanName(roll).match(/-?\d+/)?.[0] ?? "";
}

function maneuverResultText(result, positive, negative) {
  if (positive) return localize("TENEBRE.ModernChat.Passed");
  if (negative) return localize("TENEBRE.ModernChat.Failed");
  return cleanName(result);
}

function cleanEffectText(value) {
  return cleanName(value)
    .replace(/\.;/g, ";")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+\./g, ".")
    .trim();
}

function stripTrailingUses(value) {
  return cleanName(value).replace(/\s*\(\s*\d+\s*\/\s*\d+\s*\)\s*$/, "");
}

function ammoRecoveryTestText(threshold) {
  const value = cleanName(threshold);
  if (!value) return "";
  return localizeFormat("TENEBRE.ModernChat.AmmoRecoveryTest", { threshold: value });
}

function ammoRecoveryFlavorText({ actorName = "", ammoName = "", success = false, failure = false } = {}) {
  const actor = cleanName(actorName);
  const ammo = cleanName(ammoName);
  if (!actor || !ammo) return "";
  if (success) return localizeFormat("TENEBRE.ModernChat.AmmoRecoverySuccessFlavor", { actor, ammo });
  if (failure) return localizeFormat("TENEBRE.ModernChat.AmmoRecoveryFailureFlavor", { actor, ammo });
  return localizeFormat("TENEBRE.ModernChat.AmmoRecoveryNeutralFlavor", { actor, ammo });
}

function deathRollFlavorText({ actorName = "", success = false, failure = false, criticalSuccess = false, criticalFailure = false, healing = "", failureCount = "" } = {}) {
  const actor = cleanName(actorName);
  if (!actor) return "";
  if (criticalSuccess) return localizeFormat("TENEBRE.ModernChat.DeathRollCriticalSuccessFlavor", { actor, healing: cleanName(healing) || "0" });
  if (criticalFailure) return localizeFormat("TENEBRE.ModernChat.DeathRollCriticalFailureFlavor", { actor });
  if (success) return localizeFormat("TENEBRE.ModernChat.DeathRollSuccessFlavor", { actor });
  if (failure) return localizeFormat("TENEBRE.ModernChat.DeathRollFailureFlavor", { actor, count: cleanName(failureCount) || "?" });
  return localizeFormat("TENEBRE.ModernChat.DeathRollNeutralFlavor", { actor });
}

function deathRollTestText(message) {
  const formula = normalizeComparable(message?.rolls?.[0]?.formula ?? message?.rolls?.[0]?._formula ?? "");
  if (formula.includes("2d20kl")) return localize("TENEBRE.ModernChat.DeathRollTestBestOfTwo");
  if (formula.includes("2d20kh")) return localize("TENEBRE.ModernChat.DeathRollTestWorstOfTwo");
  return localize("TENEBRE.ModernChat.DeathRollTest");
}

function parseAmmoRecoveryRoll(line) {
  const cleaned = cleanName(line);
  const match = cleaned.match(/(?:testa|tests)\s+(.+?)\s+\((.+?);\s*(?:recupera com|recovers on)\s+(\d+)\s+(?:ou menos|or less)\)/i);
  return {
    ammo: cleanName(match?.[1] ?? ""),
    type: cleanName(match?.[2] ?? ""),
    threshold: cleanName(match?.[3] ?? "")
  };
}

function firstNonHeaderNumber(text, excluded = []) {
  const ignored = new Set(excluded.map(String).filter(Boolean));
  for (const line of text.split("\n")) {
    const cleaned = cleanName(line);
    if (!cleaned || /^Recupera[cç][aã]o de Muni[cç][aã]o$/i.test(cleaned)) continue;
    const number = cleaned.match(/\b\d+\b/)?.[0] ?? "";
    if (number && !ignored.has(number)) return number;
  }
  return "";
}

function restRows(text, hunger) {
  const rows = [];
  const healed = cleanName(text.match(/Recuperou\s+(\d+)\s+de Vitalidade/i)?.[1] ?? "");
  const corruption = cleanName(text.match(/Corrup[cç][aã]o tempor[aá]ria zerada\s*\((\d+)\)/i)?.[1] ?? "");
  const natural = cleanName(text.match(/Recuperou\s+(\d+)\s+ponto\(s\)\s+de Vigoroso/i)?.[1] ?? "");
  if (healed) rows.push([localize("TENEBRE.ModernChat.Healing"), healed]);
  if (corruption) rows.push([localize("TENEBRE.ModernChat.Corruption"), corruption]);
  if (natural) rows.push([localize("TENEBRE.ModernChat.HungerRecovery"), natural]);
  if (hunger) rows.push([localize("TENEBRE.ModernChat.Starvation"), localize("TENEBRE.ModernChat.Checked")]);
  return rows;
}

function restFlavorText({ actorName = "", days = "", hunger = false, failure = false, dead = false } = {}) {
  const actor = cleanName(actorName);
  const dayCount = cleanName(days) || "1";
  if (!actor) return "";
  if (!hunger) return localizeFormat("TENEBRE.ModernChat.RestFlavor", { actor, days: dayCount });
  if (dead) return localizeFormat("TENEBRE.ModernChat.RestHungerDeadFlavor", { actor, days: dayCount });
  if (failure) return localizeFormat("TENEBRE.ModernChat.RestHungerFailureFlavor", { actor, days: dayCount });
  return localizeFormat("TENEBRE.ModernChat.RestHungerSuccessFlavor", { actor, days: dayCount });
}

function restStarvationRollValue(text) {
  const cleaned = cleanName(text);
  return cleaned.match(/(?:Rolou|Rolled)\s*\[[^\]]+\]\s*(?:→|->)\s*(-?\d+)/i)?.[1]
    ?? cleaned.match(/(?:Rolou|Rolled)\s*(-?\d+)/i)?.[1]
    ?? "";
}

function restStarvationTestText(text) {
  const cleaned = cleanName(text);
  const match = cleaned.match(/(?:Rolou|Rolled)\s*(?:\[[^\]]+\]\s*)?(?:→|->)?\s*(-?\d+)\s+(?:contra|against)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]*?)\s+(-?\d+)/i);
  if (!match) return "";
  const attribute = cleanName(match[2]);
  const target = cleanName(match[3]);
  const against = activeModernChatFlavorLanguageKey().startsWith("en") ? "Against" : "Contra";
  const inWord = activeModernChatFlavorLanguageKey().startsWith("en") ? "in" : "em";
  return `1D20 ${against} ${target} ${inWord} ${attribute}`;
}

function restNotes(text) {
  const notes = [];
  const movement = text.match(/Enquanto estiver com Fome.+?velocidade\./i)?.[0]
    ?? text.match(/While.+?Hunger.+?speed\./i)?.[0];
  if (movement) notes.push(cleanName(movement));

  for (const line of text.split("\n").map(cleanName)) {
    if (/^Dia\s+\d+:/i.test(line) || /^Day\s+\d+:/i.test(line)) notes.push(line);
    else if (/morreu por inani[cç][aã]o|died of starvation/i.test(line)) notes.push(line);
    else if (/Vigoroso.+(?:diminuiu|chegou)|Strong.+(?:reduced|reached)/i.test(line)) notes.push(line);
  }
  return [...new Set(notes)];
}

function maneuverImage(title) {
  return MANEUVER_IMAGE_BY_TITLE[normalizeComparable(title)] ?? "";
}

function attackAmmoName(actor, weaponItem) {
  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  const activeAmmoName = cleanName(activeRoll?.chosenAmmo?.recoveryName || activeRoll?.chosenAmmo?.name || "");
  if (activeRoll?.actor === actor && activeRoll?.weapon?.id === weaponItem?.id && activeAmmoName && !isQuiverName(activeAmmoName)) {
    return activeAmmoName;
  }

  const lastShot = actor?.getFlag?.(MODULE_ID, "lastShot");
  if (!lastShot?.ammoName || !weaponItem?.id) return "";
  if (lastShot.weaponId !== weaponItem.id) return "";
  const elapsed = Date.now() - (Number(lastShot.timestamp) || 0);
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 15000) return "";
  return isQuiverName(lastShot.ammoName) ? "" : cleanName(lastShot.ammoName);
}

function rememberResistContext(context) {
  game.tenebreResources ??= {};
  game.tenebreResources.lastResistContext = {
    ...context,
    timestamp: Date.now()
  };
}

function recentAttackContextForResistRequest(message, text) {
  const created = Number(message?.timestamp ?? message?._source?.timestamp ?? Date.now());
  const targetName = cleanName(
    text.match(/^(.+?)\s+(?:deve clicar|must click)/i)?.[1]
      ?? text.match(/To:\s*(.+?)(?:\n|$)/i)?.[1]
      ?? ""
  );
  const messages = [...(game?.messages?.contents ?? [])].reverse();
  for (const candidate of messages) {
    if (candidate?.id === message?.id) continue;
    const candidateTime = Number(candidate?.timestamp ?? candidate?._source?.timestamp ?? 0);
    if (created && candidateTime && Math.abs(created - candidateTime) > 15000) continue;

    const candidateText = normalizeText(plainTextFromHtml(candidate?.content ?? ""));
    const parsed = parseAttackContextFromText(candidateText);
    if (!parsed?.attackerName || !parsed?.weaponName) continue;

    const attackerActor = findActorByName(parsed.attackerName);
    const weapon = findActorItemByName(attackerActor, parsed.weaponName);
    const resolvedTargetName = cleanName(parsed.targetName || targetName);
    return {
      attackerName: parsed.attackerName,
      attackerActor,
      targetName: resolvedTargetName,
      targetActor: findActorByName(resolvedTargetName),
      weaponName: weapon?.name || parsed.weaponName,
      weapon
    };
  }
  return null;
}

function parseAttackContextFromText(text) {
  const native = text.match(/^(.+?)\s+(?:ataca com|attacks? with)\s+(.+?)(?:\n|$)/im);
  if (native) {
    return {
      attackerName: cleanName(native[1]),
      weaponName: cleanAttackWeaponName(native[2])
    };
  }

  const modernWithTarget = text.match(/(.+?)\s+(?:atacou|attacked)\s+(.+?)\s+(?:usando|using|com|with)\s+(.+?)(?:,|\.|$)/i);
  if (modernWithTarget) {
    return {
      attackerName: cleanName(modernWithTarget[1]),
      targetName: cleanName(modernWithTarget[2]),
      weaponName: cleanAttackWeaponName(modernWithTarget[3])
    };
  }

  const modernNoTarget = text.match(/(.+?)\s+(?:atacou com|attacked with)\s+(.+?)(?:,|\.|$)/i);
  if (modernNoTarget) {
    return {
      attackerName: cleanName(modernNoTarget[1]),
      weaponName: cleanAttackWeaponName(modernNoTarget[2])
    };
  }

  const illustrated = text.match(/\bAttack\s+(.+?)\s+Attacked\s+(.+?)\s+(?:RESULT|ACERTOU|FALHOU|SUCCESS|FAILURE)\b/i);
  if (illustrated) {
    return {
      attackerName: cleanName(illustrated[1]),
      weaponName: cleanAttackWeaponName(illustrated[2])
    };
  }

  return null;
}

function cleanAttackWeaponName(name) {
  return cleanName(name)
    .replace(/\s+(?:e|and)\s+(?:acertou|errou|hit|miss(?:ed|es)?|failed)\b.*$/i, "")
    .trim();
}

function recentResistContextForCombat(text, weaponName) {
  if (!/\b(tenta se defender do ataque|tries to defend against the attack)\b/i.test(text)) return null;
  const context = game.tenebreResources?.lastResistContext;
  if (!context?.timestamp) return null;
  const elapsed = Date.now() - Number(context.timestamp);
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 60000) return null;
  if (weaponName && context.weaponName && normalizeComparable(weaponName) !== normalizeComparable(context.weaponName)) return null;
  const attackerFromText = cleanName(text.match(/^(.+?)\s+(?:ataca com|attacks? with)\s+/im)?.[1] ?? "");
  if (attackerFromText && context.attackerName && normalizeComparable(attackerFromText) !== normalizeComparable(context.attackerName)) return null;
  const targetFromText = cleanName(lineValue(text, "Vítima") || lineValue(text, "Victim") || hitTargetName(text));
  if (targetFromText && context.targetName && normalizeComparable(targetFromText) !== normalizeComparable(context.targetName)) return null;
  return context;
}

function shouldHideAutomaticAmmoUseMessage(message, source, text) {
  if (lineValue(text, "Rolagem") || source.querySelector?.(".tenebre-recovery-card, .tenebre-reload-card")) return false;

  const match = text.match(/^(.+?)\s+(?:utiliza|uses)\s+(.+?)(?:\n|$)/im);
  if (!match) return false;

  const actor = speakerActor(message) ?? findActorByName(cleanName(match[1]));
  const ammoName = cleanName(match[2]);
  if (!actor || !ammoName) return false;

  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  const activeAmmoName = cleanName(activeRoll?.chosenAmmo?.recoveryName || activeRoll?.chosenAmmo?.name || "");
  if (activeRoll?.actor === actor && normalizeComparable(activeAmmoName) === normalizeComparable(ammoName)) return true;

  const lastShot = actor.getFlag?.(MODULE_ID, "lastShot");
  if (!lastShot?.ammoName || isQuiverName(lastShot.ammoName)) return false;
  const elapsed = Date.now() - (Number(lastShot.timestamp) || 0);
  return normalizeComparable(lastShot.ammoName) === normalizeComparable(ammoName)
    && Number.isFinite(elapsed)
    && elapsed >= 0
    && elapsed <= 15000;
}

function symbaroumFlag(message, key) {
  return message.getFlag?.("symbaroum", key) ?? message.flags?.symbaroum?.[key];
}

function shouldHideApplyResultsMessage(message) {
  const applyEffects = symbaroumFlag(message, "applyEffects");
  if (!applyEffects) return false;
  if (!game.user?.isGM) return true;
  return isDuplicateApplyResultsMessage(message, applyEffects);
}

function isDuplicateApplyResultsMessage(message, applyEffects) {
  const messages = game.messages?.contents ?? [];
  const currentIndex = messages.findIndex((candidate) => candidate?.id === message?.id);
  if (currentIndex <= 0) return false;

  const created = Number(message?.timestamp ?? message?._source?.timestamp ?? 0);
  const payload = stableJson(applyEffects);
  if (!payload) return false;

  return messages.slice(0, currentIndex).some((candidate) => {
    const candidateEffects = symbaroumFlag(candidate, "applyEffects");
    if (!candidateEffects || stableJson(candidateEffects) !== payload) return false;

    const candidateCreated = Number(candidate?.timestamp ?? candidate?._source?.timestamp ?? 0);
    if (!created || !candidateCreated) return true;
    return Math.abs(created - candidateCreated) <= 5000;
  });
}

function stableJson(value) {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return "";
  }
}

function shouldHideStaleResistButtonMessage(message, source, text) {
  if (!source.querySelector?.("#applyEffect")) return false;
  if (!isResistButtonText(text)) return false;
  const resistData = symbaroumFlag(message, "resistRoll");
  if (!resistData) return hasLaterResistanceResult(message, null, text);
  return hasLaterResistanceResult(message, resistData, text);
}

function isResistButtonText(text) {
  return /\b(pode resistir ao ataque usando|can resist the attack using)\b/i.test(text);
}

function parseResistRequestCard(source, text) {
  const headings = [...(source.querySelectorAll?.(".symbaroum.chat.ability h4") ?? [])]
    .map((node) => cleanName(node.innerText))
    .filter(Boolean);
  const attackLine = headings.find((line) => /\b(ataca com|attacks? with)\b/i.test(line))
    ?? cleanName(text.match(/^(.+?\s+(?:ataca com|attacks? with)\s+.+)$/im)?.[1] ?? "");
  const resistLine = headings.find((line) => /\b(pode resistir ao ataque usando|can resist the attack using)\b/i.test(line))
    ?? cleanName(text.match(/^(.+?\s+(?:pode resistir ao ataque usando|can resist the attack using)\s+.+)$/im)?.[1] ?? "");
  if (!attackLine || !resistLine) return null;

  const attackMatch = attackLine.match(/^(.+?)\s+(?:ataca com|attacks? with)\s+(.+)$/i);
  const resistMatch = resistLine.match(/^(.+?)\s+(?:pode resistir ao ataque usando|can resist the attack using)\s+(.+)$/i);
  if (!attackMatch || !resistMatch) return null;

  return {
    attackerName: cleanName(attackMatch[1]),
    weaponName: cleanName(attackMatch[2]),
    targetName: cleanName(resistMatch[1]),
    resistAttribute: cleanName(resistMatch[2])
  };
}

function isResistNoticeText(text) {
  return /\b(deve clicar no botão\s+"?Rolar resistência"?|must click on the\s+"?resist"?\s+button|aguardando teste de resist[êe]ncia|waiting for resistance test)\b/i.test(text);
}

function hasLaterResistanceResult(message, resistData, text) {
  const created = Number(message?.timestamp ?? message?._source?.timestamp ?? 0);
  if (!created) return false;

  const attacker = cleanName(
    resistData?.actingCharName
      || text.match(/^(.+?)\s+ataca com/i)?.[1]
      || text.match(/^(.+?)\s+attacks? with/i)?.[1]
      || ""
  );
  const target = cleanName(
    resistData?.targetData?.name
      || text.match(/^(.+?)\s+pode resistir ao ataque/i)?.[1]
      || text.match(/^(.+?)\s+can resist the attack/i)?.[1]
      || ""
  );
  const weapon = cleanName(resistWeaponNameFromRequest(text, resistData));
  if (!attacker && !target && !weapon) return false;

  const messages = game?.messages?.contents ?? [];
  return messages.some((candidate) => {
    const candidateTime = Number(candidate?.timestamp ?? candidate?._source?.timestamp ?? 0);
    if (!candidateTime || candidateTime <= created) return false;
    const candidateText = normalizeText(candidate?.content ?? "");
    if (!candidateText || !isResistanceResultText(candidateText)) return false;
    if (attacker && !candidateText.toLowerCase().includes(attacker.toLowerCase())) return false;
    if (target && !candidateText.toLowerCase().includes(target.toLowerCase())) return false;
    return !weapon || candidateText.toLowerCase().includes(weapon.toLowerCase());
  });
}

function resistWeaponNameFromRequest(text, data) {
  return cleanName(
    data?.combatId
      ? game?.items?.get?.(data.combatId)?.name
      : text.match(/ataca com\s+(.+?)(?:\n|$)/i)?.[1]
        ?? text.match(/attacks with\s+(.+?)(?:\n|$)/i)?.[1]
        ?? ""
  );
}

function isResistanceResultText(text) {
  return /\b(tenta se defender do ataque|tries to defend against the attack)\b/i.test(text)
    && /\b(Result|Resultado|Rolagem)\b/i.test(text);
}

function isQuiverName(name) {
  const value = normalizeComparable(name);
  return value.includes("aljava") || value.includes("quiver");
}

function causedDamageValue(value, message, actor = null) {
  const formula = causedDamageFormula(value, message);
  if (!formula) return "";
  if (!/[dD]\d+/.test(formula)) return formula;

  const total = rawDamageTotal(message, formula);
  const visible = annotateFormula(formula, actor);
  return {
    html: `${visible}${Number.isFinite(total) ? ` = ${escapeHtml(total)}` : ""}`
  };
}

function causedDamageFormula(value, message = null) {
  return cleanName(damageRollFormula(message) || value)
    .replace(/\s+-\s+\([^)]*\).*$/, "")
    .replace(/\s+-\s+\d+.*$/, "")
    .trim();
}

function causedDamageTotal(value, message) {
  const formula = causedDamageFormula(value, message);
  if (!formula) return NaN;
  if (/[dD]\d+/.test(formula)) return rawDamageTotal(message, formula);
  return Number(firstRollValue(formula));
}

function appliedDamageTotal(value) {
  const total = Number(firstRollValue(value));
  return Number.isFinite(total) ? total : NaN;
}

function protectionValue(damage, message, appliedDamage) {
  const caused = causedDamageTotal(damage, message);
  const applied = appliedDamageTotal(appliedDamage);
  if (!Number.isFinite(caused) || !Number.isFinite(applied)) return "";
  return String(Math.max(0, caused - applied));
}

function criticalState(text, damage = "") {
  const combined = `${text}\n${damage}`;
  if (/Falha Cr[ií]tica|Critical Failure|Fallo Cr[ií]tico|Kritischer Patzer/i.test(combined)) return "failure";
  if (/Sucesso Cr[ií]tico|Critical Success|Réussite Critique|Éxito Cr[ií]tico|\[crit\.?\]/i.test(combined)) return "success";
  return "";
}

function damageRollFormula(message) {
  const roll = findDamageRoll(message);
  return cleanName(roll?._formula ?? roll?.formula ?? "");
}

function findDamageRoll(message) {
  const rolls = flattenRolls(message?.rolls ?? []);
  const candidates = rolls.filter((roll) => (roll?.dice ?? []).some((die) => Number(die.faces) !== 20));
  const damageOnly = candidates.filter((roll) => !(roll?.dice ?? []).some((die) => Number(die.faces) === 20));
  const source = damageOnly.length ? damageOnly : candidates;
  source.sort((a, b) => scoreDamageRoll(b) - scoreDamageRoll(a));
  return source[0] ?? null;
}

function scoreDamageRoll(roll) {
  const formula = cleanName(roll?._formula ?? roll?.formula ?? "");
  const dice = roll?.dice ?? [];
  const nonD20Dice = dice.filter((die) => Number(die.faces) !== 20).length;
  const diceTerms = formula.match(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi)?.length ?? 0;
  const namedModifiers = formula.match(/\[[^\]]+\]/g)?.length ?? 0;
  const damageDiceTerms = formula.match(/\d+d(?!20\b)\d+(?:k[hl])?(?:\[[^\]]+\])?/gi)?.length ?? 0;
  return namedModifiers * 1000 + damageDiceTerms * 100 + diceTerms * 10 + nonD20Dice + formula.length / 1000;
}

function rawDamageTotal(message, formula) {
  const roll = findDamageRoll(message);
  if (!roll) return NaN;

  const rawFormula = cleanName(formula);
  const diceTerms = rawFormula.match(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi) ?? [];
  if (!diceTerms.length) {
    const numeric = Number(rawFormula.match(/-?\d+/)?.[0]);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  let total = 0;
  const damageDice = (roll.dice ?? [])
    .filter((die) => Number(die.faces) !== 20)
    .slice(0, diceTerms.length);

  for (const die of damageDice) {
    if (Number(die.faces) === 20) continue;
    for (const result of die.results ?? []) {
      if (result.active === false) continue;
      total += Number(result.result) || 0;
    }
  }

  const numericModifier = rawFormula
    .replace(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi, "")
    .match(/[+-]\s*\d+\b/g)
    ?.reduce((sum, term) => sum + Number(term.replace(/\s+/g, "")), 0) ?? 0;

  return total + numericModifier || NaN;
}

function flattenRolls(rolls) {
  const found = [];
  const visit = (roll) => {
    if (!roll) return;
    if (roll.formula || roll.dice?.length) found.push(roll);
    for (const term of roll.terms ?? []) {
      for (const nested of term.rolls ?? []) visit(nested);
    }
  };
  for (const roll of rolls) visit(roll);
  return found;
}

function annotateFormula(formula, actor = null) {
  const cleaned = cleanName(formula);
  return escapeHtml(cleaned).replace(/(\d+d\d+(?:k[hl])?)\[(.+?)\]/gi, (_match, dice, source) => {
    const sourceItem = findActorItemByName(actor, source);
    const sourceImg = sourceItem?.img && !isUnknownImage(sourceItem.img)
      ? `<img src="${escapeHtml(sourceItem.img)}" alt="">`
      : `<i class="fas fa-sparkles"></i>`;
    return `
      <span class="tenebre-modern-chat-source">
        ${escapeHtml(dice)}
        <span class="tenebre-modern-chat-source-tooltip">
          ${sourceImg}
          <strong>${escapeHtml(sourceItem?.name ?? source)}</strong>
        </span>
      </span>
    `;
  });
}

function findActorItemByName(actor, name) {
  const wanted = normalizeComparable(name);
  if (!actor || !wanted) return null;
  return actor.items?.find((item) => normalizeComparable(item.name) === wanted)
    ?? actor.items?.find((item) => normalizeComparable(item.name).includes(wanted) || wanted.includes(normalizeComparable(item.name)))
    ?? null;
}

function resistActor(message, data) {
  return actorByTokenId(data?.tokenId)
    ?? findActorByName(data?.actingCharName)
    ?? null;
}

function resistTargetActor(text, data) {
  return actorByTokenId(data?.targetData?.tokenId)
    ?? findActorByName(data?.targetData?.name)
    ?? resistTargetUserActor(text, data)
    ?? [...(game.user?.targets ?? [])].at(0)?.actor
    ?? null;
}

function actorByTokenId(tokenId) {
  if (!tokenId) return null;
  return globalThis.canvas?.tokens?.get?.(tokenId)?.actor
    ?? globalThis.canvas?.tokens?.objects?.children?.find?.((token) => token.id === tokenId)?.actor
    ?? null;
}

function resistTargetUserActor(text, data) {
  const userName = cleanName(data?.targetUserName || text.match(/^(.+?)\s+(?:deve clicar|must click)/i)?.[1] || "");
  if (!userName) return null;
  return game.users?.find((user) => user.name === userName)?.character ?? null;
}

function resistWeapon(actor, data) {
  const flaggedWeapon = data?.weapon;
  const flaggedName = cleanName(flaggedWeapon?.name);
  const flaggedItem = findActorItemByName(actor, flaggedName);
  if (flaggedItem) return flaggedItem;
  if (flaggedName || flaggedWeapon?.img) {
    return {
      name: flaggedName,
      img: flaggedWeapon?.img,
      uuid: flaggedWeapon?.uuid
    };
  }

  const combatItem = data?.combatId ? actor?.items?.get?.(data.combatId) : null;
  if (combatItem?.type === "weapon") return combatItem;

  const activeRoll = game.tenebreResources?.activeWeaponRoll;
  if (activeRoll?.actor === actor && activeRoll.weapon) return activeRoll.weapon;

  const combatIds = [
    actor?.system?.combat?.weapon?.id,
    actor?.system?.combat?.activeWeapon,
    actor?.system?.combat?.selectedWeapon,
    actor?.system?.combat?.id
  ].filter(Boolean);
  for (const combatId of combatIds) {
    const item = actor?.items?.get?.(combatId);
    if (item?.type === "weapon") return item;
  }

  return actor?.items?.find((item) => item.type === "weapon" && isActiveInventoryItem(item))
    ?? actor?.items?.find((item) => item.type === "weapon")
    ?? null;
}

function isActiveInventoryItem(item) {
  const state = String(item?.system?.state ?? "").toLowerCase();
  return item?.system?.isEquipped === true || state === "equipped" || state === "active";
}

function findChatItem(source, actor, name) {
  if (!actor) return null;
  const itemId = source.querySelector("[data-item-id]")?.dataset?.itemId;
  return (itemId ? actor.items?.get(itemId) : null)
    ?? findActorItemByName(actor, name);
}

function attributeRollLinkedItem(source, actor) {
  const itemId = source.querySelector("p[data-item-id]")?.dataset?.itemId
    ?? source.querySelector("[data-item-id]")?.dataset?.itemId;
  if (itemId && actor?.items?.get(itemId)) return actor.items.get(itemId);
  const name = cleanName(source.querySelector("p[data-item-id]")?.innerText ?? "");
  return name ? findActorItemByName(actor, name) : null;
}

function renderRowValue(value) {
  if (value && typeof value === "object" && "html" in value) return value.html;
  if (value && typeof value === "object" && "text" in value) return escapeHtml(value.text);
  return escapeHtml(value);
}

function rowValue(rows, label) {
  const normalizedLabel = cleanName(label).toLowerCase();
  const row = rows.find(([key]) => cleanName(key).toLowerCase() === normalizedLabel);
  return row?.[1] ?? "";
}

function shouldShowModifier(value) {
  if (value === undefined || value === null) return false;
  const cleaned = cleanName(value);
  if (!cleaned) return false;
  const numeric = Number(cleaned.replace("+", ""));
  return Number.isFinite(numeric) ? numeric !== 0 : cleaned !== "0";
}

function signedModifier(value) {
  const cleaned = cleanName(value);
  const numeric = Number(cleaned.replace("+", ""));
  if (!Number.isFinite(numeric)) return cleaned;
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

function findAttributeLine(text) {
  return text.split("\n").map(cleanName).find((line) => /\(\s*-?\d+\s*\)/.test(line) && !/^Resultado/i.test(line)) ?? "";
}

function hitTargetName(text) {
  return text.match(/\bacerta\s+(.+?)(?:\n|$)/i)?.[1]
    ?? text.match(/\bhits?\s+(.+?)(?:\n|$)/i)?.[1]
    ?? "";
}

function findAbilityTitle(source, text) {
  return source.querySelector(".subText")?.innerText
    ?? [...text.split("\n").map(cleanName)].find((line) => /\((Novato|Novice|Adepto|Adept|Mestre|Master)\)/i.test(line))
    ?? firstHeadingText(source);
}

function symbaroumCardTitle(card, source, text) {
  const title = card?.querySelector(".subText")?.innerText
    ?? card?.querySelector("p.name")?.innerText
    ?? firstHeadingText(card ?? source)
    ?? [...text.split("\n").map(cleanName)].find((line) => /\((Novato|Novice|Adepto|Adept|Mestre|Master)\)/i.test(line))
    ?? "";
  return stripLevelSuffix(title);
}

function effectFromCard(card, itemName, type) {
  if (!card) return null;
  const finalText = [...card.querySelectorAll(".finalTxt p")]
    .map((node) => cleanName(node.innerText))
    .filter(Boolean)
    .filter((line) => !sameText(line, itemName))
    .join(" ");
  if (finalText) return effectDetails({ full: finalText });

  const full = [...card.querySelectorAll("p")]
    .map((node) => cleanName(node.innerText))
    .filter(Boolean)
    .filter((line) => !sameText(line, itemName) && !sameText(line, type))
    .filter((line) => stripLevelSuffix(line) !== itemName)
    .slice(0, 2)
    .join(" ");
  return full ? effectDetails({ full }) : null;
}

function stripLevelSuffix(value) {
  return cleanName(value).replace(/\s*\((Novato|Novice|Adepto|Adept|Mestre|Master)\)\s*$/i, "");
}

function itemLevelFromText(value) {
  const match = cleanName(value).match(/\((Novato|Novice|Adepto|Adept|Mestre|Master)\)/i)
    ?? cleanName(value).match(/\b(Novato|Novice|Adepto|Adept|Mestre|Master)\b/i);
  if (!match) return "";
  const label = match[1];
  return Object.entries(LEVEL_NAMES).find(([, pattern]) => pattern.test(label))?.[0] ?? "";
}

function activeItemLevel(item) {
  const system = item?.system;
  if (!system) return "";
  if (system.master?.isActive) return "master";
  if (system.adept?.isActive) return "adept";
  if (system.novice?.isActive || system.marker) return "novice";
  return "";
}

function effectFromItem(item, level = "") {
  if (!item?.system) return "";
  const system = item.system;
  const resolvedLevel = level || activeItemLevel(item);
  const candidates = [
    resolvedLevel ? system[resolvedLevel]?.description : "",
    system.description
  ];
  const text = candidates.map(plainTextFromHtml).find(Boolean) ?? "";
  if (!text) return null;
  return effectDetails({
    full: text,
    title: item.name,
    level: resolvedLevel,
    action: resolvedLevel ? system[resolvedLevel]?.action : ""
  });
}

function effectDetails({ full = "", title = "", level = "", action = "" } = {}) {
  const cleaned = cleanName(full);
  if (!cleaned) return null;
  return {
    summary: summarizeEffect(cleaned),
    full: cleaned,
    title: cleanName(title),
    level: cleanName(level),
    action: cleanName(action)
  };
}

function itemEffectValue(details) {
  if (!details?.full) return "";

  const meta = [
    details.level ? `${localize("TENEBRE.ModernChat.Level")}: ${levelLabel(details.level)}` : "",
    details.action ? `${localize("TENEBRE.ModernChat.Action")}: ${details.action}` : ""
  ].filter(Boolean).join(" · ");

  return {
    fullRow: true,
    html: `
      <details class="tenebre-modern-chat-effect">
        <summary>${escapeHtml(localize("TENEBRE.ModernChat.ViewDescription"))}</summary>
        <div class="tenebre-modern-chat-effect-card">
          ${details.title ? `<strong>${escapeHtml(details.title)}</strong>` : ""}
          ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
          <p>${escapeHtml(details.full)}</p>
        </div>
      </details>
    `
  };
}

function levelLabel(level) {
  if (level === "novice") return localize("TENEBRE.ModernChat.Novice");
  if (level === "adept") return localize("TENEBRE.ModernChat.Adept");
  if (level === "master") return localize("TENEBRE.ModernChat.Master");
  return level;
}

function plainTextFromHtml(value) {
  const raw = String(value ?? "");
  if (!raw.trim()) return "";
  const div = document.createElement("div");
  div.innerHTML = raw;
  return cleanName(div.textContent ?? div.innerText ?? raw)
    .replace(/^(Descri[cç][aã]o|Description)\s*:\s*/i, "");
}

function summarizeEffect(value, maxLength = 190) {
  const cleaned = cleanName(value);
  if (!cleaned) return "";

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  let summary = sentences[0] ?? cleaned;
  if (summary.length < 55 && sentences[1]) summary = `${summary} ${sentences[1]}`;
  if (summary.length <= maxLength) return summary;

  const clipped = summary.slice(0, maxLength + 1);
  return `${clipped.slice(0, Math.max(0, clipped.lastIndexOf(" "))).trim()}...`;
}

function sameText(left, right) {
  return normalizeComparable(left) === normalizeComparable(right);
}

function lineValue(text, label) {
  if (!label) return "";
  const escaped = escapeRegex(label);
  return text.match(new RegExp(`^\\s*${escaped}\\s*:?\\s*(.+)$`, "im"))?.[1]?.trim() ?? "";
}

function rollLineValue(text) {
  return lineValue(text, "Resultado da rolagem de dados")
    || lineValue(text, "Rolagem")
    || lineValue(text, "Result")
    || lineValue(text, "Roll")
    || cleanName(text.match(/(?:Resultado da rolagem de dados|Rolagem|Result|Roll)\s*:?\s*(-?\d+)/i)?.[1] ?? "");
}

function firstHeadingText(source) {
  return source.querySelector("h1,h2,h3,h4")?.innerText ?? "";
}

function firstItalicText(source) {
  return source.querySelector("em,i:not(.fas)")?.innerText ?? "";
}

function firstParagraphWithClass(source, className) {
  return source.querySelector(`p.${className}`)?.innerText ?? "";
}

function mainItemImage(source, excluded = []) {
  return chatImages(source, excluded).at(-1) ?? "";
}

function chatImages(source, excluded = []) {
  const excludedSet = new Set(excluded.filter(Boolean));
  return [...source.querySelectorAll("img")]
    .map((img) => img.getAttribute("src"))
    .filter((src) => src && !isUnknownImage(src) && !excludedSet.has(src));
}

function targetImageFromSource(source) {
  const introImages = [...source.querySelectorAll(".introImg")];
  const bg = introImages.at(-1)?.style?.backgroundImage ?? "";
  return bg.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
}

function introImageFromSource(source) {
  const introImages = [...source.querySelectorAll(".introImg")];
  const bg = introImages.at(0)?.style?.backgroundImage ?? "";
  return bg.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
}

function speakerActor(message) {
  const actorId = message?.speaker?.actor;
  return actorId ? game.actors?.get(actorId) ?? null : null;
}

function findActorByName(name) {
  if (!name) return null;
  const wanted = normalizeComparable(name);
  return game.actors?.find((actor) => actor.name === name)
    ?? game.actors?.find((actor) => normalizeComparable(actor.name) === wanted)
    ?? null;
}

function findMentionedActor(text) {
  const normalizedText = normalizeComparable(text);
  if (!normalizedText) return null;
  return game.actors?.find((actor) => {
    const name = normalizeComparable(actor.name);
    return name && (
      normalizedText.startsWith(`${name} `)
      || normalizedText.startsWith(`${name}\n`)
      || normalizedText.includes(`\n${name} `)
    );
  }) ?? null;
}

function resolveElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return html?.element instanceof HTMLElement ? html.element : null;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractTextWithNewlines(element) {
  if (!element) return "";
  // In Foundry V12, hooks often pass unattached DOM elements.
  // HTMLElement.innerText relies on layout and may be empty or unformatted.
  if (element.isConnected && element.innerText && element.innerText.trim() !== "") {
    return element.innerText;
  }
  
  const clone = element.cloneNode(true);
  for (const br of clone.querySelectorAll("br")) br.replaceWith("\n");
  for (const el of clone.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, tr, header, footer")) {
    el.prepend("\n");
    el.append("\n");
  }
  return clone.textContent;
}

function cleanName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeComparable(value) {
  return cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isUnknownImage(src) {
  return !src || UNKNOWN_IMAGE_PARTS.some((part) => String(src).includes(part));
}

function localize(key) {
  return game.i18n.localize(key);
}

function localizeFormat(key, data) {
  return game.i18n.format(key, data);
}

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
