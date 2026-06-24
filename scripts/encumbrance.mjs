import { FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { actorItems, itemQuantity } from "./item-flags.mjs";
import { detectEncumbranceSlots, hasMassiveQuality, isArmorByName, ENC_SLOTS } from "./encumbrance-db.mjs";

export class EncumbranceService {

  /**
   * Retorna os espaços de carga de um único item (por unidade).
   * Prioridade: flag manual > detecção automática.
   */
  static getItemSlots(item) {
    if (!item) return ENC_SLOTS.ONE;

    const manual = item.getFlag?.(FLAG_SCOPE, "encumbranceSlots");
    if (manual !== undefined && manual !== null) return Number(manual);

    if (item.type === "weapon" && hasMassiveQuality(item)) return ENC_SLOTS.TWO;

    if (item.type === "armor") {
      return ENC_SLOTS.ZERO;
    }

    if (isArmorByName(item.name) && item.type === "equipment") {
      return ENC_SLOTS.ZERO;
    }

    return detectEncumbranceSlots(item.name);
  }

  /**
   * Calcula a carga total de um ator.
   * Retorna um objeto com todas as informações de sobrecarga.
   */
  static calculateLoad(actor) {
    if (!actor) return defaultLoadResult();

    const strong = Number(actor.system?.attributes?.strong?.value ?? 10);
    const bonus = Number(actor.system?.attributes?.strong?.bonus ?? 0);
    const tempMod = Number(actor.system?.attributes?.strong?.temporaryMod ?? 0);
    const totalStrong = strong + bonus + tempMod;

    const hasPorter = actorHasAbility(actor, ["transportador", "porter", "pack mule"]);
    const capacity = hasPorter ? Math.floor(totalStrong * 1.5) : totalStrong;
    const maxCapacity = capacity * 2;

    let currentLoad = 0;
    const itemBreakdown = [];

    for (const item of actorItems(actor)) {
      const slots = this.getItemSlots(item);
      const qty = itemQuantity(item);
      const totalSlots = slots * qty;

      itemBreakdown.push({
        id: item.id,
        name: item.name,
        img: item.img,
        slotsPerUnit: slots,
        quantity: qty,
        totalSlots
      });

      currentLoad += totalSlots;
    }

    const overload = Math.max(0, currentLoad - capacity);
    const defensePenalty = overload;
    const isOverloaded = currentLoad > capacity;
    const isImmobilized = currentLoad > maxCapacity;

    return {
      currentLoad,
      capacity,
      maxCapacity,
      overload,
      defensePenalty,
      isOverloaded,
      isImmobilized,
      strong: totalStrong,
      hasPorter,
      items: itemBreakdown
    };
  }

  /**
   * Atribui automaticamente o flag de encumbranceSlots a um item
   * se ele ainda não tiver valor definido.
   */
  static async autoAssignSlots(item) {
    if (!item || !item.id) return;
    if (!["equipment", "weapon"].includes(item.type)) return;

    const existing = item.getFlag?.(FLAG_SCOPE, "encumbranceSlots");
    if (existing !== undefined && existing !== null) return;

    let slots;
    if (item.type === "weapon" && hasMassiveQuality(item)) {
      slots = ENC_SLOTS.TWO;
    } else {
      slots = detectEncumbranceSlots(item.name);
    }

    try {
      await item.setFlag(FLAG_SCOPE, "encumbranceSlots", slots);
    } catch (err) {
      console.warn(`Tenebre Resources | Could not auto-assign encumbrance to "${item.name}":`, err.message);
    }
  }

  /**
   * Varre todos os itens de um ator e atribui slots faltantes.
   */
  static async autoAssignAll(actor) {
    if (!actor) return;
    const items = actorItems(actor).filter(i => ["equipment", "weapon"].includes(i.type));
    for (const item of items) {
      await this.autoAssignSlots(item);
    }
  }
}

function defaultLoadResult() {
  return {
    currentLoad: 0,
    capacity: 10,
    maxCapacity: 20,
    overload: 0,
    defensePenalty: 0,
    isOverloaded: false,
    isImmobilized: false,
    strong: 10,
    hasPorter: false,
    items: []
  };
}

function actorHasAbility(actor, aliases) {
  if (!actor?.items) return false;
  for (const item of actor.items) {
    if (item.type === "ability" || item.type === "trait" || item.type === "boon") {
      const name = (item.name || "").toLowerCase();
      for (const alias of aliases) {
        if (name.includes(alias.toLowerCase())) return true;
      }
    }
  }
  return false;
}
