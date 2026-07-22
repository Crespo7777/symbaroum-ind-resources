import { MODULE_ID } from "./constants.mjs";
import { GM_LOG_EVENT_CATEGORIES, gmLogEventPresentation } from "./gm-log-events.mjs";
import { GmLogService, isGmLogEnabled } from "./gm-log-service.mjs";

const applicationsApi = globalThis.foundry?.applications?.api;
const ApplicationV2 = applicationsApi?.ApplicationV2 ?? class {};
const HandlebarsApplicationMixin = applicationsApi?.HandlebarsApplicationMixin ?? ((Base) => Base);

const APPLICATION_ID = "tenebre-gm-log-window";
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/gm-log.hbs`;
const TOGGLE_ID = "tenebre-gm-log-toggle";
const TOGGLE_ICON = "fa-solid fa-list-ul";
const UPDATE_HOOK = `${MODULE_ID}.gmLogUpdated`;
const POSITION_SETTING = "gmLogWindowPosition";
const ENABLE_SETTING = "enableGmLog";
const POSITION_VERSION = 1;
const POSITION_SAVE_DELAY_MS = 250;
const VIEWPORT_MARGIN = 16;
const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 260;
const ALL_CATEGORIES = "all";
const VALID_CATEGORIES = new Set(Object.values(GM_LOG_EVENT_CATEGORIES));

export function normalizeGmLogWindowPosition(value, viewport = {}) {
  if (!value || typeof value !== "object" || Number(value.version) !== POSITION_VERSION) return null;

  const viewportWidth = finitePositive(viewport.width, globalThis.innerWidth);
  const viewportHeight = finitePositive(viewport.height, globalThis.innerHeight);
  const rawWidth = Number(value.width);
  const rawHeight = Number(value.height);
  const rawLeft = Number(value.left);
  const rawTop = Number(value.top);
  if (![viewportWidth, viewportHeight, rawWidth, rawHeight, rawLeft, rawTop].every(Number.isFinite)) return null;

  const availableWidth = Math.max(1, viewportWidth - (VIEWPORT_MARGIN * 2));
  const availableHeight = Math.max(1, viewportHeight - (VIEWPORT_MARGIN * 2));
  const minimumWidth = Math.min(MIN_WINDOW_WIDTH, availableWidth);
  const minimumHeight = Math.min(MIN_WINDOW_HEIGHT, availableHeight);
  const width = clamp(rawWidth, minimumWidth, availableWidth);
  const height = clamp(rawHeight, minimumHeight, availableHeight);
  const left = clamp(rawLeft, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN));
  const top = clamp(rawTop, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - height - VIEWPORT_MARGIN));

  return { left, top, width, height };
}

export function filterGmLogEvents(events = [], category = ALL_CATEGORIES) {
  const normalizedCategory = VALID_CATEGORIES.has(category) ? category : ALL_CATEGORIES;
  const source = Array.isArray(events) ? events : [];
  return normalizedCategory === ALL_CATEGORIES
    ? source.slice()
    : source.filter((event) => event?.category === normalizedCategory);
}

export function formatGmLogEvent(event, { localize, formatTime } = {}) {
  const presentation = gmLogEventPresentation(event);
  if (!presentation || typeof localize !== "function") return null;
  return Object.freeze({
    id: event.eventId || event.source?.messageId || "",
    category: event.category,
    outcome: event.outcome,
    time: typeof formatTime === "function" ? String(formatTime(event.occurredAt) ?? "") : "",
    text: String(localize(presentation.key, presentation.data) ?? "")
  });
}

export class GmLogApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: APPLICATION_ID,
    classes: ["tenebre-gm-log-app"],
    window: {
      title: "TENEBRE.GmLog.Ui.Title",
      resizable: true
    },
    position: {
      width: 520,
      height: 480
    }
  };

  static PARTS = {
    main: {
      template: TEMPLATE_PATH,
      scrollable: [".tenebre-gm-log-list"]
    }
  };

  #category = ALL_CATEGORIES;
  #onVisibilityChange;
  #positionSaveTimer = null;

  constructor({ onVisibilityChange, ...options } = {}) {
    super(options);
    this.#onVisibilityChange = typeof onVisibilityChange === "function" ? onVisibilityChange : null;
  }

  async _prepareContext(_options) {
    const events = filterGmLogEvents(GmLogService.events, this.#category)
      .map((event) => formatGmLogEvent(event, {
        localize: (key, data) => game.i18n.format(key, data),
        formatTime
      }))
      .filter(Boolean);

    return {
      events,
      hasEvents: events.length > 0,
      categories: categoryOptions().map(([value, key]) => ({
        value,
        label: localize(key),
        selected: value === this.#category
      }))
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#onVisibilityChange?.(true);

    const root = this.element;
    root?.querySelector?.(".tenebre-gm-log-filter")?.addEventListener("change", (event) => {
      const value = event.currentTarget?.value;
      this.#category = VALID_CATEGORIES.has(value) ? value : ALL_CATEGORIES;
      this.render({ force: true });
    });
    root?.querySelector?.("[data-action='clear-log']")?.addEventListener("click", (event) => {
      event.preventDefault();
      GmLogService.clear();
    });

    const list = root?.querySelector?.(".tenebre-gm-log-list");
    if (list) list.scrollTop = list.scrollHeight;
  }

  refresh() {
    if (isApplicationRendered(this)) this.render({ force: true });
  }

  _onPosition(position) {
    super._onPosition?.(position);
    if (!isApplicationRendered(this)) return;
    clearTimeout(this.#positionSaveTimer);
    this.#positionSaveTimer = setTimeout(() => {
      this.#positionSaveTimer = null;
      void persistWindowPosition(position);
    }, POSITION_SAVE_DELAY_MS);
  }

  async close(options = {}) {
    clearTimeout(this.#positionSaveTimer);
    this.#positionSaveTimer = null;
    await persistWindowPosition(this.position);
    await super.close(options);
    this.#onVisibilityChange?.(false);
  }
}

export class GmLogUiService {
  static #registered = false;
  static #application = null;

  static register() {
    if (this.#registered || !game.user?.isGM) return;
    this.#registered = true;

    Hooks.on("renderChatLog", (application, element) => {
      if (application?.isPopout) return;
      this.#mount(resolveElement(element));
    });
    Hooks.on(UPDATE_HOOK, () => {
      if (isGmLogEnabled()) this.#application?.refresh();
    });
    Hooks.on(`${MODULE_ID}.settingsChanged`, (key, value) => {
      if (key === ENABLE_SETTING) void this.syncEnabledState(Boolean(value));
    });

    void this.syncEnabledState(isGmLogEnabled());
  }

  static async syncEnabledState(enabled = isGmLogEnabled()) {
    if (!game.user?.isGM) return;
    if (enabled) {
      this.#mount(document.getElementById("chat"));
      return;
    }

    document.getElementById(TOGGLE_ID)?.remove();
    if (isApplicationRendered(this.#application)) await this.#application.close();
  }

  static #mount(host) {
    if (!game.user?.isGM || !isGmLogEnabled() || !(host instanceof HTMLElement)) return;
    const controls = resolveChatControls(host);
    if (!(controls instanceof HTMLElement)) return;

    let toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.id = TOGGLE_ID;
      toggle.type = "button";
      toggle.className = "ui-control icon tenebre-gm-log-toggle";
      toggle.setAttribute("aria-controls", APPLICATION_ID);
      toggle.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.#toggleApplication();
      });
    }

    const rollPrivacy = controls.querySelector(":scope > #roll-privacy");
    if (rollPrivacy instanceof HTMLElement) rollPrivacy.append(toggle);
    else {
      const nativeControls = controls.querySelector(":scope > .control-buttons");
      controls.insertBefore(toggle, nativeControls ?? null);
    }
    this.#syncToggle(isApplicationRendered(this.#application));
  }

  static async #toggleApplication() {
    if (!isGmLogEnabled()) return;
    if (isApplicationRendered(this.#application)) {
      await this.#application.close();
      return;
    }

    const storedPosition = readStoredWindowPosition();
    const applicationOptions = {
      onVisibilityChange: (open) => this.#syncToggle(open)
    };
    if (storedPosition) applicationOptions.position = storedPosition;
    this.#application ??= new GmLogApplication(applicationOptions);
    this.#application.render({ force: true });
  }

  static #syncToggle(open) {
    const toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", String(Boolean(open)));
    toggle.setAttribute("aria-label", localize("TENEBRE.GmLog.Ui.Toggle"));
    toggle.title = localize("TENEBRE.GmLog.Ui.Toggle");
    toggle.classList.toggle("active", Boolean(open));
    toggle.replaceChildren(createIcon(TOGGLE_ICON));
    if (!open && document.activeElement?.closest?.(`#${APPLICATION_ID}`)) toggle.focus();
  }
}

function createIcon(className) {
  const icon = document.createElement("i");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function categoryOptions() {
  return [
    [ALL_CATEGORIES, "TENEBRE.GmLog.Ui.Category.All"],
    [GM_LOG_EVENT_CATEGORIES.COMBAT, "TENEBRE.GmLog.Ui.Category.Combat"],
    [GM_LOG_EVENT_CATEGORIES.ROLLS, "TENEBRE.GmLog.Ui.Category.Rolls"],
    [GM_LOG_EVENT_CATEGORIES.RESOURCES, "TENEBRE.GmLog.Ui.Category.Resources"],
    [GM_LOG_EVENT_CATEGORIES.STATUS, "TENEBRE.GmLog.Ui.Category.Status"],
    [GM_LOG_EVENT_CATEGORIES.INVENTORY, "TENEBRE.GmLog.Ui.Category.Inventory"],
    [GM_LOG_EVENT_CATEGORIES.SYSTEM, "TENEBRE.GmLog.Ui.Category.System"]
  ];
}

function resolveElement(element) {
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return document.getElementById("chat");
}

function resolveChatControls(element) {
  if (!(element instanceof HTMLElement)) return document.getElementById("chat-controls");
  if (element.id === "chat-controls") return element;
  return element.querySelector("#chat-controls")
    ?? element.closest("#chat-controls")
    ?? document.getElementById("chat-controls");
}

function isApplicationRendered(application) {
  if (!application) return false;
  const renderedState = ApplicationV2.RENDER_STATES?.RENDERED;
  return renderedState !== undefined
    ? application.state === renderedState
    : Boolean(application.rendered);
}

function formatTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return "--:--";
  try {
    return new Intl.DateTimeFormat(game.i18n.lang || undefined, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "--:--";
  }
}

function localize(key) {
  return game.i18n.localize(key);
}

function readStoredWindowPosition() {
  try {
    const value = game.settings.get(MODULE_ID, POSITION_SETTING);
    return normalizeGmLogWindowPosition(value) ?? undefined;
  } catch {
    return undefined;
  }
}

async function persistWindowPosition(position) {
  if (!game.user?.isGM) return;
  const normalized = normalizeGmLogWindowPosition({
    version: POSITION_VERSION,
    left: position?.left,
    top: position?.top,
    width: position?.width,
    height: position?.height
  });
  if (!normalized) return;

  const next = { version: POSITION_VERSION, ...normalized };
  try {
    const current = game.settings.get(MODULE_ID, POSITION_SETTING);
    if (sameWindowPosition(current, next)) return;
    await game.settings.set(MODULE_ID, POSITION_SETTING, next);
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to persist the GM log window position.`, error);
  }
}

function sameWindowPosition(left, right) {
  return left?.version === right.version
    && left?.left === right.left
    && left?.top === right.top
    && left?.width === right.width
    && left?.height === right.height;
}

function finitePositive(value, fallback) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) return number;
  const fallbackNumber = Number(fallback);
  return Number.isFinite(fallbackNumber) && fallbackNumber > 0 ? fallbackNumber : Number.NaN;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
