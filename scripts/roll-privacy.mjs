import { MODULE_ID } from "./constants.mjs";

export class RollPrivacyService {
  static #privateRollDepth = 0;
  static #registered = false;

  static register() {
    if (this.#registered) return;
    this.#registered = true;
    Hooks.on("preCreateChatMessage", (message, data, _options, userId) => {
      if (userId && userId !== game.user?.id) return;
      if (!this.isEnabled()) return;
      if (!this.isPrivateRollActive() || !this.#isRollMessage(message, data)) return;
      this.applyToMessageSource(message, data);
    });
  }

  static isEnabled() {
    try {
      return game.settings.get(MODULE_ID, "enableRollPrivacy") !== false;
    } catch (_error) {
      return true;
    }
  }

  static isPrivateRollActive() {
    return this.isEnabled() && this.#privateRollDepth > 0;
  }

  static async runPrivateRoll(enabled, callback) {
    if (!this.isEnabled() || !enabled) return callback();
    this.#privateRollDepth += 1;
    try {
      return await callback();
    } finally {
      this.#privateRollDepth = Math.max(0, this.#privateRollDepth - 1);
    }
  }

  static isChecked(root) {
    if (!this.isEnabled()) return false;
    const element = root?.[0] ?? root;
    return Boolean(element?.querySelector?.('input[name="tenebrePrivateRoll"]')?.checked);
  }

  static fieldHtml() {
    if (!this.isEnabled()) return "";
    const label = game.i18n.localize("TENEBRE.RollPrivacy.Label");
    const hint = game.i18n.localize("TENEBRE.RollPrivacy.Hint");
    return `
      <div class="advantage tenebre-private-roll-option" title="${this.#escapeAttribute(hint)}">
        <label for="tenebre-private-roll">${this.#escapeHtml(label)}</label>
        <span class="lblfavour"><input type="checkbox" id="tenebre-private-roll" name="tenebrePrivateRoll"></span>
      </div>
    `;
  }

  static injectField(content) {
    const source = String(content ?? "");
    if (!this.isEnabled()) return source;
    if (!source || source.includes('name="tenebrePrivateRoll"')) return source;
    const favourIndex = source.indexOf('<div class="favour">');
    if (favourIndex >= 0) {
      return `${source.slice(0, favourIndex)}${this.fieldHtml()}${source.slice(favourIndex)}`;
    }
    const closingIndex = source.lastIndexOf("</div>");
    if (closingIndex < 0) return `${source}${this.fieldHtml()}`;
    return `${source.slice(0, closingIndex)}${this.fieldHtml()}${source.slice(closingIndex)}`;
  }

  static prepareChatData(chatData, { rollCandidate = false } = {}) {
    if (!this.isEnabled() || !chatData || !rollCandidate || !this.isPrivateRollActive()) return chatData;
    const flags = foundry.utils.deepClone(chatData.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      privateRoll: true,
      privateRollCandidate: true
    };
    chatData.flags = flags;
    chatData.whisper = this.#gmUserIds();
    chatData.blind = true;
    return chatData;
  }

  static applyToMessageSource(message, data = {}) {
    if (!this.isEnabled()) return false;
    const flags = foundry.utils.deepClone(message?.flags ?? data?.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      privateRoll: true
    };
    message.updateSource({
      whisper: this.#gmUserIds(),
      blind: true,
      flags
    });
    return true;
  }

  static diceRecipients() {
    if (!this.isEnabled() || !this.isPrivateRollActive()) return null;
    return Array.from(game.users ?? []).filter((user) => user.isGM);
  }

  static #isRollMessage(message, data) {
    const rolls = message?.rolls ?? data?.rolls;
    if (Array.isArray(rolls) && rolls.length > 0) return true;
    if (rolls && !Array.isArray(rolls)) return true;
    if (message?.roll ?? data?.roll) return true;
    return Boolean(
      message?.flags?.[MODULE_ID]?.privateRollCandidate
      ?? data?.flags?.[MODULE_ID]?.privateRollCandidate
    );
  }

  static #gmUserIds() {
    return Array.from(game.users ?? [])
      .filter((user) => user.isGM)
      .map((user) => user.id);
  }

  static #escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  static #escapeAttribute(value) {
    return this.#escapeHtml(value).replace(/`/g, "&#96;");
  }
}
