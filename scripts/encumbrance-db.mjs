import { normalize } from "./utils.mjs";

/**
 * Categorias de itens para sobrecarga.
 * ZERO = não conta (roupas, containers leves)
 * ONE  = 1 espaço (equipamento padrão)
 * TWO  = 2 espaços (armas Maciças, containers pesados)
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

/**
 * Retorna o valor base de encumbrance para um item baseado em seu nome.
 * Prioridade: flag manual > detecção por nome > fallback (1).
 */
export function detectEncumbranceSlots(itemName) {
  const name = normalize(itemName || "");
  if (!name) return ENC_SLOTS.ONE;

  if (matchesAliases(name, CLOTHING_ALIASES)) return ENC_SLOTS.ZERO;
  if (matchesAliases(name, LIGHT_CONTAINER_ALIASES)) return ENC_SLOTS.ZERO;
  if (matchesAliases(name, SMALL_ITEM_ALIASES)) return ENC_SLOTS.ZERO;
  if (matchesAliases(name, HEAVY_CONTAINER_ALIASES)) return ENC_SLOTS.TWO;
  if (matchesAliases(name, MASSIVE_WEAPON_ALIASES)) return ENC_SLOTS.TWO;

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

  const massiveTerms = ["macica", "maciça", "massive"];
  for (const term of massiveTerms) {
    if (desc.includes(term) || ref.includes(term) || name.includes(term)) return true;
  }

  const qualities = item?.system?.qualities;
  if (qualities) {
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

function matchesAliases(normalizedName, aliases) {
  return aliases.some(alias => normalizedName.includes(normalize(alias)));
}
