import { normalize } from "./utils.mjs";

/**
 * Categorias de itens para sobrecarga.
 * ZERO = não conta (roupas, containers leves)
 * ONE  = 1 espaço (equipamento padrão)
 * TWO  = 2 espaços (armas Maciças)
 */
export const ENC_SLOTS = { ZERO: 0, ONE: 1, TWO: 2 };

const CLOTHING_ALIASES = [
  "calca", "calças", "trousers", "pants",
  "camisa", "shirt", "blouse", "blusa",
  "casaco", "coat", "jacket", "jaqueta",
  "cachecol", "scarf",
  "sapatos", "shoes",
  "botas", "boots", "bota",
  "sandalia", "sandalias", "sandals",
  "sapatos de neve", "snowshoes",
  "cinto", "belt", "cinturao",
  "luvas", "gloves", "luva",
  "chapeu", "hat", "chapéu",
  "capuz", "hood",
  "capa", "cloak", "manto", "mantle",
  "vestido", "dress", "gown",
  "tunica", "tunic", "túnica",
  "toga", "robe", "robes",
  "tabardo", "tabard",
  "avental", "apron",
  "meias", "socks", "stockings",
  "veu", "veil", "véu",
  "bandana", "headband", "faixa",
  "poncho",
  "clothes", "clothing", "roupa", "roupas", "vestimenta", "vestimentas",
  "traje", "outfit", "attire"
];

const LIGHT_CONTAINER_ALIASES = [
  "mochila", "backpack", "rucksack",
  "bolsa", "bag", "pouch", "purse",
  "sacola", "satchel", "sack",
  "alforje", "saddlebag", "alforjes",
  "aljava", "quiver", "estojo",
  "bolsa de moedas", "coin purse", "money pouch",
  "bolsa de componentes", "component pouch",
  "porta-pergaminhos", "scroll case",
  "cartucheira", "bandolier",
  "pochete", "belt pouch",
  "odre", "waterskin", "wineskin",
  "cantil", "flask", "canteen"
];

const HEAVY_CONTAINER_ALIASES = [
  "barril", "barrel", "keg",
  "bau", "baú", "chest", "trunk",
  "caixa", "box", "crate",
  "arca", "coffer"
];

const MASSIVE_WEAPON_ALIASES = [
  "montante", "greatsword", "great sword",
  "martelo de guerra", "warhammer", "war hammer", "maul",
  "machado de batalha", "greataxe", "great axe", "battleaxe",
  "alabarda", "halberd", "glaive",
  "espada bastarda", "bastard sword",
  "lanca longa", "pike", "long spear",
  "mangual pesado", "heavy flail"
];

const SMALL_ITEM_ALIASES = [
  "moeda", "moedas", "coin", "coins", "shilling", "shillings", "thaler", "thalers", "orteg", "ortegs",
  "ampulheta", "hourglass",
  "pingente", "pendant", "amulet", "amuleto",
  "anel", "ring",
  "broche", "brooch",
  "joia", "joias", "jewel", "jewelry", "gem", "gems", "gemstone",
  "brinco", "earring",
  "pulseira", "bracelet",
  "colar", "necklace",
  "chave", "key", "keys", "chaves",
  "agulha", "needle",
  "botao", "button",
  "dado", "dice", "dados",
  "ficha", "token",
  "sinete", "signet",
  "apito", "whistle"
];

const RATION_ALIASES = [
  "pao de viagem", "pão de viagem", "travel bread", "waybread",
  "racao de viagem", "ração de viagem", "racao", "ração", "ration", "rations"
];

const PROJECTILE_ALIASES = [
  "flecha", "flechas", "arrow", "arrows",
  "virote", "virotes", "bolt", "bolts",
  "quarrel", "quarrels",
  "precision arrow", "flaming arrow", "grappling arrow",
  "ensnaring arrow", "whistling arrow",
  "stun bolt", "stunning bolt"
];

const ARMOR_ALIASES = [
  "armadura", "armor", "armour",
  "cota de malha", "chain mail", "chainmail",
  "couro", "leather", "leather armor",
  "placas", "plate", "plate armor", "full plate",
  "brigandina", "brigandine",
  "couraça", "cuirass", "breastplate",
  "gambeson", "gambesão",
  "escudo", "shield", "buckler",
  "elmo", "helmet", "helm",
  "lamelar", "lamellar",
  "cota de escamas", "scale mail", "scale armor",
  "order cloak", "capa da ordem",
  "concealed armor", "armadura oculta",
  "blessed robe", "túnica abençoada",
  "witch gown", "vestido de bruxa",
  "wolf skin", "pele de lobo",
  "crow armor", "armadura de corvo",
  "lacquered silk armor", "armadura de seda laqueada",
  "steel armor", "armadura de aço",
  "woven silk", "seda tecida",
  "bark armor", "armadura de casca"
];

const DEFAULT_WEIGHT_CONFIG = { version: 2, items: {}, bundles: {} };

let baseWeightConfig = DEFAULT_WEIGHT_CONFIG;
let dynamicWeightConfig = emptyWeightConfig();
let weightConfig = DEFAULT_WEIGHT_CONFIG;
let baseWeightConfigFingerprint = JSON.stringify(DEFAULT_WEIGHT_CONFIG);

export async function loadEncumbranceWeights(moduleId) {
  const url = `modules/${moduleId}/data/encumbrance-weights.json`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const nextConfig = sanitizeWeightConfig(await response.json());
    const nextFingerprint = JSON.stringify(nextConfig);
    if (nextFingerprint === baseWeightConfigFingerprint) return false;
    baseWeightConfig = nextConfig;
    baseWeightConfigFingerprint = nextFingerprint;
  } catch (err) {
    const nextFingerprint = JSON.stringify(DEFAULT_WEIGHT_CONFIG);
    const changed = baseWeightConfigFingerprint !== nextFingerprint;
    baseWeightConfig = DEFAULT_WEIGHT_CONFIG;
    baseWeightConfigFingerprint = nextFingerprint;
    console.warn(`Tenebre Resources | Could not load ${url}; using built-in encumbrance weights.`, err);
    if (!changed) return false;
  }
  rebuildWeightConfig();
  return true;
}

export function applyDynamicEncumbranceWeights(config) {
  dynamicWeightConfig = sanitizeWeightConfig(config, emptyWeightConfig());
  rebuildWeightConfig();
}

export function getDynamicEncumbranceWeights() {
  return {
    version: 2,
    items: { ...dynamicWeightConfig.items },
    bundles: cloneBundles(dynamicWeightConfig.bundles)
  };
}

export function getMergedEncumbranceWeights() {
  return {
    version: 2,
    items: { ...weightConfig.items },
    bundles: cloneBundles(weightConfig.bundles)
  };
}

export function hasConfiguredEncumbranceRule(itemName) {
  return Boolean(findExactItemEntry(itemName, weightConfig.items) || findExactItemEntry(itemName, weightConfig.bundles));
}

export function upsertDynamicSlotRule(itemName, slots) {
  const itemNameText = String(itemName ?? "").trim();
  const sanitizedSlots = Number(slots);
  if (!itemNameText || !Number.isFinite(sanitizedSlots) || sanitizedSlots < 0) return false;

  dynamicWeightConfig.items[itemNameText] = sanitizedSlots;
  rebuildWeightConfig();
  return true;
}

/**
 * Retorna o valor base de encumbrance para um item baseado em seu nome.
 * Prioridade: flag manual > JSON de pesos > fallback (1).
 */
export function detectEncumbranceSlots(itemName) {
  const entry = findExactItemEntry(itemName, weightConfig.items);
  return entry ? entry.value : ENC_SLOTS.ONE;
}

export function hasExactEncumbranceItem(itemName) {
  return Boolean(findExactItemEntry(itemName, weightConfig.items));
}

/**
 * Verifica se um item é uma armadura pelo nome.
 */
export function isArmorByName(itemName) {
  return matchesAliases(normalize(itemName || ""), ARMOR_ALIASES);
}

/**
 * Verifica se um item tem a qualidade Maciça (Massive) na descrição.
 */
export function hasMassiveQuality(item) {
  const desc = normalize(item?.system?.description || "");
  const ref = normalize(item?.system?.reference || "");
  const name = normalize(item?.name || "");
  const quality = normalize(item?.system?.quality || "");

  const massiveTerms = ["macica", "maciça", "massive"];
  for (const term of massiveTerms) {
    if (desc.includes(term) || ref.includes(term) || name.includes(term) || quality.includes(term)) return true;
  }

  const qualities = item?.system?.qualities;
  if (qualities) {
    if (qualities.massive === true) return true;
    const qualStr = typeof qualities === "string" ? normalize(qualities) : "";
    for (const term of massiveTerms) {
      if (qualStr.includes(term)) return true;
    }
  }
  return false;
}

/**
 * Verifica se o item é roupa (não conta para sobrecarga).
 */
export function isClothing(itemName) {
  return matchesAliases(normalize(itemName || ""), CLOTHING_ALIASES);
}

/**
 * Verifica se o item é um container leve (não conta, apenas conteúdo).
 */
export function isLightContainer(itemName) {
  return matchesAliases(normalize(itemName || ""), LIGHT_CONTAINER_ALIASES);
}

/**
 * Verifica se o item é considerado pequeno (moedas, jóias, etc).
 */
export function isSmallItem(itemName) {
  return matchesAliases(normalize(itemName || ""), SMALL_ITEM_ALIASES);
}

/**
 * Regra de pacote para itens empilhados.
 */
export function getStackBundleRule(itemName) {
  return findExactItemEntry(itemName, weightConfig.bundles)?.value ?? null;
}

/**
 * Compatibilidade com codigo antigo: retorna apenas o tamanho do pacote.
 */
export function getStackBundleSize(itemName) {
  return getStackBundleRule(itemName)?.bundleSize ?? 1;
}

export function getStackBundleSlots(itemName) {
  return getStackBundleRule(itemName)?.slots ?? 1;
}

function matchesAliases(normalizedName, aliases) {
  const searchableName = toSearchableText(normalizedName);
  return aliases.some((alias) => {
    const searchableAlias = toSearchableText(alias).trim();
    return Boolean(searchableAlias) && searchableName.includes(` ${searchableAlias} `);
  });
}

function toSearchableText(value) {
  return ` ${normalize(value).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")} `;
}

function rebuildWeightConfig() {
  weightConfig = {
    version: 2,
    items: { ...baseWeightConfig.items, ...dynamicWeightConfig.items },
    bundles: { ...baseWeightConfig.bundles, ...dynamicWeightConfig.bundles }
  };
}

function sanitizeWeightConfig(config, fallback = DEFAULT_WEIGHT_CONFIG) {
  const fallbackItems = fallback.items ?? {};
  const fallbackBundles = fallback.bundles ?? {};

  const items = {
    ...fallbackItems,
    ...sanitizeItems(config?.items),
    ...legacySlotsToItems(config?.slots)
  };
  const bundles = {
    ...fallbackBundles,
    ...sanitizeBundles(config?.bundles)
  };

  return {
    version: 2,
    items,
    bundles
  };
}

function sanitizeItems(items) {
  if (!items || typeof items !== "object" || Array.isArray(items)) return {};
  return Object.fromEntries(Object.entries(items)
    .map(([name, slots]) => [String(name ?? "").trim(), Number(slots)])
    .filter(([name, slots]) => name && Number.isFinite(slots) && slots >= 0));
}

function sanitizeBundles(bundles) {
  if (!bundles) return {};

  if (Array.isArray(bundles)) {
    const entries = {};
    for (const rule of bundles) {
      const bundle = sanitizeBundleValue(rule);
      if (!bundle) continue;
      for (const alias of sanitizeAliases(rule?.aliases)) {
        entries[alias] = bundle;
      }
    }
    return entries;
  }

  if (typeof bundles !== "object") return {};
  return Object.fromEntries(Object.entries(bundles)
    .map(([name, value]) => [String(name ?? "").trim(), sanitizeBundleValue(value)])
    .filter(([name, value]) => name && value));
}

function sanitizeBundleValue(value) {
  const source = typeof value === "number" ? { bundleSize: value, slots: ENC_SLOTS.ONE } : value;
  const bundleSize = Math.floor(Number(source?.bundleSize));
  if (!Number.isFinite(bundleSize) || bundleSize <= 1) return null;

  const slots = Number(source?.slots ?? ENC_SLOTS.ONE);
  if (!Number.isFinite(slots) || slots < 0) return null;
  return { bundleSize, slots };
}

function legacySlotsToItems(slots) {
  if (!Array.isArray(slots)) return {};
  const items = {};
  for (const rule of slots) {
    const value = Number(rule?.slots);
    if (!Number.isFinite(value) || value < 0) continue;
    for (const alias of sanitizeAliases(rule?.aliases)) {
      items[alias] = value;
    }
  }
  return items;
}

function sanitizeAliases(aliases) {
  if (!Array.isArray(aliases)) return [];
  return aliases.map((alias) => String(alias ?? "").trim()).filter(Boolean);
}

function cloneBundles(bundles) {
  return Object.fromEntries(Object.entries(bundles ?? {}).map(([name, rule]) => [
    name,
    { bundleSize: rule.bundleSize, slots: rule.slots }
  ]));
}

function emptyWeightConfig() {
  return { version: 2, items: {}, bundles: {} };
}

function findExactItemEntry(itemName, entries) {
  const normalizedName = normalize(itemName || "");
  if (!normalizedName || !entries) return null;

  for (const [name, value] of Object.entries(entries)) {
    if (normalize(name) === normalizedName) return { name, value };
  }
  return null;
}
