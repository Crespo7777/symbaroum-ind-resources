import { MODULE_ID } from "./constants.mjs";
import { RollPrivacyService } from "./roll-privacy.mjs";

export async function evaluateRoll(formula) {
  if (globalThis.Roll) {
    const roll = new Roll(formula);
    await roll.evaluate();
    return roll;
  }

  return createFallbackRoll(formula);
}

export function rollTotal(roll) {
  return Number(roll?.total ?? 0) || 0;
}

export async function createChatMessageAfterDice({ speaker, content, rolls = [] }) {
  const foundryRolls = rolls.filter(isFoundryRoll);
  const privateRoll = RollPrivacyService.isPrivateRollActive();
  const showed3d = await showDice3d(foundryRolls, { privateRoll });
  const chatData = { speaker, content };

  if (foundryRolls.length && !showed3d) {
    chatData.rolls = foundryRolls;
    chatData.sound = globalThis.CONFIG?.sounds?.dice;
  }

  if (foundryRolls.length) {
    chatData.flags = {
      [MODULE_ID]: { privateRollCandidate: true }
    };
    RollPrivacyService.prepareChatData(chatData, { rollCandidate: true });
  }

  return ChatMessage.create(chatData);
}

function isFoundryRoll(roll) {
  return Boolean(globalThis.Roll && roll instanceof Roll);
}

async function showDice3d(rolls, { privateRoll = false } = {}) {
  const dice3d = globalThis.game?.dice3d;
  if (!rolls.length || typeof dice3d?.showForRoll !== "function") return false;

  try {
    for (const roll of rolls) {
      const recipients = privateRoll ? RollPrivacyService.diceRecipients() : null;
      await Promise.resolve(dice3d.showForRoll(roll, game.user, true, recipients, privateRoll));
    }
    return true;
  } catch (error) {
    console.warn("symbaroum-ind-resources | Dice 3D animation failed. Falling back to chat roll.", error);
    return false;
  }
}

function createFallbackRoll(formula) {
  const match = String(formula).trim().match(/^1d(\d+)$/i);
  if (!match) {
    return { total: 0, formula };
  }

  const sides = Number(match[1]) || 20;
  return {
    total: Math.floor(Math.random() * sides) + 1,
    formula
  };
}
