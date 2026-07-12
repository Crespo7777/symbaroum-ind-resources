import { MODULE_ID } from "./constants.mjs";
import { escapeHtml, normalize } from "./utils.mjs";

const RITUALIST_NAMES = new Set(["ritualista", "ritualist"]);
const FALLBACK_RITUAL_IMAGE = "systems/symbaroum/asset/image/ritual.png";

let catalogPromise = null;
let installedRitualsPromise = null;

export const RitualBrowserService = {
  isRitualistAbility,

  async open(actor) {
    const catalog = await loadCatalog();
    const installed = await loadInstalledRituals();
    const rituals = mergeRitualSources(catalog, installed, actor);
    const content = buildRitualBrowserContent(rituals);
    const DialogV2 = foundry.applications?.api?.DialogV2;

    if (DialogV2) {
      const dialog = new DialogV2({
        window: {
          title: game.i18n.localize("TENEBRE.RitualBrowser.Title"),
          resizable: true
        },
        position: { width: 720, height: Math.min(window.innerHeight - 100, 760) },
        content,
        render: (_event, app) => {
          activateRitualLinks(app?.element, rituals);
          resetRitualBrowserScroll(app?.element);
        },
        buttons: [{
          action: "close",
          icon: "fas fa-times",
          label: game.i18n.localize("TENEBRE.Common.Close"),
          default: true
        }]
      });
      await dialog.render({ force: true });
      activateRitualLinks(dialog.element, rituals);
      resetRitualBrowserScroll(dialog.element);
      return dialog;
    }

    return new Dialog({
      title: game.i18n.localize("TENEBRE.RitualBrowser.Title"),
      content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("TENEBRE.Common.Close")
        }
      },
      render: (html) => {
        activateRitualLinks(html?.[0] ?? html, rituals);
        resetRitualBrowserScroll(html?.[0] ?? html);
      }
    }).render(true);
  },

  clearCache() {
    catalogPromise = null;
    installedRitualsPromise = null;
  }
};

export function isRitualistAbility(item) {
  return item?.type === "ability" && RITUALIST_NAMES.has(normalize(item.name).trim());
}

export function isRitualDocument(item) {
  return item?.type === "ritual" || item?.system?.isRitual === true;
}

export function isRestrictedTradition(value) {
  const text = normalize(value);
  return /\b(only|apenas)\b/.test(text) || text.includes("disponivel apenas");
}

async function loadCatalog() {
  catalogPromise ??= fetch(`modules/${MODULE_ID}/data/rituals.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => Array.isArray(data?.rituals) ? data.rituals : [])
    .catch((error) => {
      console.error(`${MODULE_ID} | Failed to load ritual catalog.`, error);
      ui.notifications?.error(game.i18n.localize("TENEBRE.RitualBrowser.LoadError"));
      return [];
    });
  return catalogPromise;
}

async function loadInstalledRituals() {
  installedRitualsPromise ??= collectInstalledRituals();
  return installedRitualsPromise;
}

async function collectInstalledRituals() {
  const rituals = [];
  addRitualDocuments(rituals, game.items ?? []);

  const packs = Array.from(game.packs ?? []).filter((pack) => {
    return pack.documentName === "Adventure" && String(pack.collection ?? "").includes("symbaroum-corerules");
  });

  for (const pack of packs) {
    try {
      const adventures = await pack.getDocuments();
      for (const adventure of adventures) {
        const embedded = adventure.items?.contents ?? adventure.toObject?.().items ?? [];
        addRitualDocuments(rituals, embedded);
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not read rituals from ${pack.collection}.`, error);
    }
  }

  return rituals;
}

function addRitualDocuments(target, documents) {
  for (const document of documents) {
    if (!isRitualDocument(document)) continue;
    const isFoundryDocument = document?.documentName === "Item" && typeof document.toObject === "function";
    target.push({
      name: document.name ?? "",
      img: document.img ?? FALLBACK_RITUAL_IMAGE,
      document: isFoundryDocument ? document : null,
      sourceData: isFoundryDocument ? null : (document.toObject?.() ?? document)
    });
  }
}

export function mergeRitualSources(catalog, installed, actor = null) {
  const installedByName = new Map();
  for (const ritual of installed) {
    const key = normalize(ritual.name).trim();
    if (key && !installedByName.has(key)) installedByName.set(key, ritual);
  }

  const ownedNames = new Set(
    Array.from(actor?.items ?? [])
      .filter(isRitualDocument)
      .map((item) => normalize(item.name).trim())
  );
  const usePortuguese = String(game.i18n?.lang ?? "").toLowerCase().startsWith("pt");

  return catalog.map((entry) => {
    const installedRitual = installedByName.get(normalize(entry.namePt).trim())
      ?? installedByName.get(normalize(entry.nameEn).trim());
    const name = usePortuguese ? entry.namePt : entry.nameEn;
    const tradition = usePortuguese ? entry.traditionPt : entry.traditionEn;
    return {
      ...entry,
      name,
      tradition,
      restricted: entry.restricted || isRestrictedTradition(tradition),
      owned: ownedNames.has(normalize(entry.namePt).trim()) || ownedNames.has(normalize(entry.nameEn).trim()),
      img: installedRitual?.img ?? FALLBACK_RITUAL_IMAGE,
      document: installedRitual?.document ?? null,
      sourceData: installedRitual?.sourceData ?? null
    };
  }).sort((a, b) => a.tradition.localeCompare(b.tradition, game.i18n?.lang) || a.name.localeCompare(b.name, game.i18n?.lang));
}

function buildRitualBrowserContent(rituals) {
  const groups = new Map();
  for (const ritual of rituals) {
    const entries = groups.get(ritual.tradition) ?? [];
    entries.push(ritual);
    groups.set(ritual.tradition, entries);
  }

  const sections = [];
  for (const [tradition, entries] of groups) {
    const rows = entries.map(renderRitual);
    sections.push(`
      <details class="tenebre-ritual-group" open>
        <summary>
          <span>${escapeHtml(tradition)}</span>
          <span class="tenebre-ritual-count">${entries.length}</span>
        </summary>
        <div class="tenebre-ritual-list">${rows.join("")}</div>
      </details>
    `);
  }

  return `
    <div class="symbaroum dialog tenebre-symbaroum-dialog tenebre-ritual-browser">
      <header class="tenebre-ritual-browser-header">
        <img src="${FALLBACK_RITUAL_IMAGE}" alt="">
        <div>
          <h2>${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.Title"))}</h2>
        </div>
      </header>
      <div class="tenebre-ritual-rules">
        <strong>${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.ProgressionTitle"))}</strong>
        <span>${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.Progression"))}</span>
        <small>${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.AccessWarning"))}</small>
      </div>
      <div class="tenebre-ritual-groups">${sections.join("")}</div>
    </div>
  `;
}

function renderRitual(ritual) {
  const badges = [
    ritual.owned ? `<span class="tenebre-ritual-badge learned">${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.Learned"))}</span>` : "",
    ritual.restricted ? `<span class="tenebre-ritual-badge restricted">${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.Restricted"))}</span>` : ""
  ].join("");
  const key = normalize(ritual.nameEn).trim();

  return `
    <button type="button" class="tenebre-ritual-entry" data-ritual-key="${escapeHtml(key)}"
      title="${escapeHtml(game.i18n.localize("TENEBRE.RitualBrowser.OpenRitual"))}">
      <img src="${escapeHtml(ritual.img)}" alt="">
      <div class="tenebre-ritual-entry-body">
        <div class="tenebre-ritual-entry-title">
          <strong>${escapeHtml(ritual.name)}</strong>
          <span>${badges}</span>
        </div>
      </div>
    </button>
  `;
}

function activateRitualLinks(root, rituals) {
  root = resolveElement(root);
  if (!root || root.dataset.tenebreRitualLinks === "true") return;
  const buttons = root.querySelectorAll("[data-ritual-key]");
  if (!buttons.length) return;
  root.dataset.tenebreRitualLinks = "true";
  const ritualsByKey = new Map(rituals.map((ritual) => [normalize(ritual.nameEn).trim(), ritual]));
  for (const button of buttons) {
    button.addEventListener("click", async () => {
      const ritual = ritualsByKey.get(button.dataset.ritualKey);
      if (ritual) await openRitualSheet(ritual);
    });
  }
}

function resolveElement(value) {
  if (value instanceof HTMLElement) return value;
  if (value?.[0] instanceof HTMLElement) return value[0];
  if (value?.element instanceof HTMLElement) return value.element;
  if (value?.element?.[0] instanceof HTMLElement) return value.element[0];
  return null;
}

function resetRitualBrowserScroll(value) {
  const root = resolveElement(value);
  if (!root) return;

  const reset = () => {
    root.scrollTop = 0;
    root.querySelector(".window-content")?.scrollTo?.({ top: 0, left: 0 });
    root.querySelector(".tenebre-ritual-groups")?.scrollTo?.({ top: 0, left: 0 });
  };
  reset();
  window.requestAnimationFrame(() => window.requestAnimationFrame(reset));
}

async function openRitualSheet(ritual) {
  let document = ritual.document;
  if (!document && ritual.sourceData) {
    try {
      const source = foundry.utils.deepClone(ritual.sourceData);
      document = CONFIG.Item.documentClass.fromSource(source, { parent: null });
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not create a temporary ritual document for ${ritual.name}.`, error);
    }
  }

  if (document?.sheet) {
    document.sheet.render(true);
    return;
  }
  ui.notifications?.warn(game.i18n.format("TENEBRE.RitualBrowser.Unavailable", { name: ritual.name }));
}
