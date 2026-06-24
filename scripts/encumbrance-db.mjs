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

const DEFAULT_WEIGHT_CONFIG = {
  slots: [
    { slots: ENC_SLOTS.ZERO, aliases: [...CLOTHING_ALIASES, ...LIGHT_CONTAINER_ALIASES, ...SMALL_ITEM_ALIASES] },
    { slots: ENC_SLOTS.ONE, aliases: [...RATION_ALIASES, ...HEAVY_CONTAINER_ALIASES] },
    { slots: ENC_SLOTS.TWO, aliases: MASSIVE_WEAPON_ALIASES }
  ],
  bundles: [
    { bundleSize: 10, slots: ENC_SLOTS.ONE, aliases: PROJECTILE_ALIASES },
    { bundleSize: 50, slots: ENC_SLOTS.ONE, aliases: SMALL_ITEM_ALIASES }
  ]
};

let baseWeightConfig = DEFAULT_WEIGHT_CONFIG;
let dynamicWeightConfig = emptyWeightConfig();
let weightConfig = DEFAULT_WEIGHT_CONFIG;

export async function loadEncumbranceWeights(moduleId) {
  const url = `modules/${moduleId}/data/encumbrance-weights.json`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    baseWeightConfig = sanitizeWeightConfig(await response.json());
  } catch (err) {
    baseWeightConfig = DEFAULT_WEIGHT_CONFIG;
    console.warn(`Tenebre Resources | Could not load ${url}; using built-in encumbrance weights.`, err);
  }
  rebuildWeightConfig();
}

export function applyDynamicEncumbranceWeights(config) {
  dynamicWeightConfig = sanitizeWeightConfig(config, emptyWeightConfig());
  rebuildWeightConfig();
}

export function getDynamicEncumbranceWeights() {
  return {
    version: 1,
    slots: dynamicWeightConfig.slots.map(cloneRule),
    bundles: dynamicWeightConfig.bundles.map(cloneRule)
  };
}

export function hasConfiguredEncumbranceRule(itemName) {
  const name = normalize(itemName || "");
  if (!name) return false;
  return weightConfig.slots.some((rule) => matchesAliases(name, rule.aliases))
    || weightConfig.bundles.some((rule) => matchesAliases(name, rule.aliases));
}

export function upsertDynamicSlotRule(itemName, slots) {
  const alias = String(itemName ?? "").trim();
  const sanitizedSlots = Number(slots);
  if (!alias || !Number.isFinite(sanitizedSlots) || sanitizedSlots < 0) return false;

  const normalizedAlias = normalize(alias);
  const existing = dynamicWeightConfig.slots.find((rule) =>
    rule.aliases.some((candidate) => normalize(candidate) === normalizedAlias)
  );

  if (existing) {
    existing.label = existing.label || alias;
    existing.slots = sanitizedSlots;
  } else {
    dynamicWeightConfig.slots.push({
      label: alias,
      slots: sanitizedSlots,
      aliases: [alias]
    });
  }

  dynamicWeightConfig.slots.sort((a, b) => String(a.label ?? a.aliases[0]).localeCompare(String(b.label ?? b.aliases[0])));
  rebuildWeightConfig();
  return true;
}

/**
 * Retorna o valor base de encumbrance para um item baseado em seu nome.
 * Prioridade: flag manual > JSON de pesos > fallback (1).
 */
export function detectEncumbranceSlots(itemName) {
  const name = normalize(itemName || "");
  if (!name) return ENC_SLOTS.ONE;

  for (const rule of weightConfig.slots) {
    if (matchesAliases(name, rule.aliases)) return rule.slots;
  }

  return ENC_SLOTS.ONE;
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
  const name = normalize(itemName || "");
  for (const rule of weightConfig.bundles) {
    if (matchesAliases(name, rule.aliases)) return rule;
  }
  return null;
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
  return aliases.some(alias => normalizedName.includes(normalize(alias)));
}

function rebuildWeightConfig() {
  weightConfig = {
    slots: [...dynamicWeightConfig.slots, ...baseWeightConfig.slots],
    bundles: [...dynamicWeightConfig.bundles, ...baseWeightConfig.bundles]
  };
}

function sanitizeWeightConfig(config, fallback = DEFAULT_WEIGHT_CONFIG) {
  const slots = Array.isArray(config?.slots)
    ? config.slots.map(sanitizeSlotRule).filter(Boolean)
    : fallback.slots;
  const bundles = Array.isArray(config?.bundles)
    ? config.bundles.map(sanitizeBundleRule).filter(Boolean)
    : fallback.bundles;

  return {
    slots: slots.length ? slots : fallback.slots.map(cloneRule),
    bundles: bundles.length ? bundles : fallback.bundles.map(cloneRule)
  };
}

function sanitizeSlotRule(rule) {
  const slots = Number(rule?.slots);
  if (!Number.isFinite(slots) || slots < 0) return null;
  const aliases = sanitizeAliases(rule?.aliases);
  if (!aliases.length) return null;
  const label = sanitizeLabel(rule?.label);
  return label ? { label, slots, aliases } : { slots, aliases };
}

function sanitizeBundleRule(rule) {
  const bundleSize = Math.floor(Number(rule?.bundleSize));
  if (!Number.isFinite(bundleSize) || bundleSize <= 1) return null;

  const slots = Number(rule?.slots ?? ENC_SLOTS.ONE);
  if (!Number.isFinite(slots) || slots < 0) return null;

  const aliases = sanitizeAliases(rule?.aliases);
  if (!aliases.length) return null;
  const label = sanitizeLabel(rule?.label);
  return label ? { label, bundleSize, slots, aliases } : { bundleSize, slots, aliases };
}

function sanitizeAliases(aliases) {
  if (!Array.isArray(aliases)) return [];
  return aliases.map((alias) => String(alias ?? "").trim()).filter(Boolean);
}

function sanitizeLabel(label) {
  const value = String(label ?? "").trim();
  return value || null;
}

function cloneRule(rule) {
  return {
    ...rule,
    aliases: [...rule.aliases]
  };
}

function emptyWeightConfig() {
  return { slots: [], bundles: [] };
}
