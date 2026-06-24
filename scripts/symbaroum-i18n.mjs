import { normalize } from "./utils.mjs";

/**
 * Rótulos conhecidos do sistema Symbaroum (en.json + pt-BR.json oficiais).
 * Usados como fallback quando game.i18n.localize retorna só o idioma ativo.
 */
const SYM_LABEL_FALLBACKS = {
  "TITLE.EQUIPMENTS": ["Equipment", "Equipamento", "Equipamentos"],
  "EQUIPMENT.NUMBER": ["Number", "Número", "Numero"],
  "WEAPON.NUMBER": ["Number", "Número", "Numero"],
  "EQUIPMENT.QUANTITY_SHORT": ["Qty.", "Qtde."],
  "EQUIPMENT.COST": ["Cost", "Custo"],
  "WEAPON.COST": ["Cost", "Custo"],
  "ARMOR.COST": ["Cost", "Custo"]
};

/**
 * Retorna todas as variantes normalizadas de uma ou mais chaves do sistema Symbaroum.
 */
export function symbaroumLabelVariants(...keys) {
  const variants = new Set();
  for (const key of keys) {
    if (!key) continue;
    const localized = game.i18n.localize(key);
    if (localized && localized !== key) {
      variants.add(normalize(localized));
    }
    for (const fallback of SYM_LABEL_FALLBACKS[key] ?? []) {
      variants.add(normalize(fallback));
    }
  }
  return variants;
}

/**
 * Verifica se um texto de rótulo corresponde a alguma chave Symbaroum (qualquer idioma suportado).
 */
export function matchesSymbaroumLabel(text, ...keys) {
  if (text == null || text === "") return false;
  const normalized = normalize(text);
  for (const key of keys) {
    if (symbaroumLabelVariants(key).has(normalized)) return true;
  }
  return false;
}
