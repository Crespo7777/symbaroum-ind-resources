import { AMMO_TYPES, FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { actorItems, changeItemQuantity, findAmmoItems, getAmmoType, itemQuantity, localizeAmmoType, isQuiver } from "./item-flags.mjs";
import { getAmmoDescription } from "./special-ammo.mjs";
import { escapeHtml } from "./utils.mjs";

export class AmmoService {
  static async selectAmmo(actor, ammoType) {
    const ammoItems = findAmmoItems(actor, ammoType);
    if (!ammoItems.length) {
      ui.notifications.warn(game.i18n.format("TENEBRE.Ammo.NoCompatibleAmmo", { type: localizeAmmoType(ammoType) }));
      return null;
    }

    const ammo = await this.promptAmmo(actor, ammoType, ammoItems);
    return ammo; // returns ammo item, or null if cancelled
  }

  static async consumeAmmo(actor, ammo, weapon, ammoType) {
    if (isQuiver(ammo)) {
      const qty = itemQuantity(ammo);
      let usesRemaining = ammo.getFlag(FLAG_SCOPE, "usesRemaining");
      if (usesRemaining === undefined || usesRemaining === null) {
        usesRemaining = 12;
      }
      
      if (usesRemaining > 1) {
        await ammo.setFlag(FLAG_SCOPE, "usesRemaining", usesRemaining - 1);
        ui.notifications.info(`Gastou 1 projétil da aljava. Restam ${usesRemaining - 1} nesta aljava.`);
      } else {
        await changeItemQuantity(ammo, -1);
        const nextQty = Math.max(0, qty - 1);
        await ammo.setFlag(FLAG_SCOPE, "usesRemaining", nextQty > 0 ? 12 : 0);
        ui.notifications.info(`Uma aljava foi esvaziada. Restam ${nextQty} aljava(s).`);
      }
    } else {
      await changeItemQuantity(ammo, -1);
    }

    await actor.setFlag(FLAG_SCOPE, "lastShot", {
      ammoItemId: ammo.id,
      ammoName: ammo.name,
      ammoType,
      weaponId: weapon.id,
      timestamp: Date.now()
    });

    if (TenebreSettings.get("showSpecialAmmoInChat") && getAmmoDescription(ammo)) {
      await postAmmoCard(actor, ammo);
    }
  }

  static async promptAmmo(_actor, ammoType, ammoItems) {
    const options = ammoItems.map((item, index) => `
      <label class="tenebre-ammo-option">
        <input type="radio" name="ammoId" value="${item.id}" ${index === 0 ? "checked" : ""}>
        <span>${escapeHtml(item.name)}</span>
        <small>${itemQuantity(item)}</small>
      </label>
    `).join("");

    const content = `
      <p>${game.i18n.format("TENEBRE.Ammo.SelectHint", { type: localizeAmmoType(ammoType) })}</p>
      <div class="tenebre-ammo-list">${options}</div>
    `;

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TENEBRE.Ammo.SelectTitle") },
      content,
      ok: {
        icon: "fas fa-check",
        label: game.i18n.localize("TENEBRE.Common.Confirm"),
        callback: (event, button, dialog) => {
          const ammoId = dialog.element.querySelector("input[name='ammoId']:checked")?.value;
          return ammoItems.find((item) => item.id === ammoId) ?? null;
        }
      },
      rejectClose: false
    });

    return result ?? null;
  }

  static async recordHit(actor, ammo) {
    if (!TenebreSettings.get("enableHitTracking") || !ammo) return;

    const ammoType = getAmmoType(ammo);
    const current = actor.getFlag(FLAG_SCOPE, "combat") ?? {};
    const ammoHits = foundry.utils.deepClone(current.ammoHits ?? {});
    const entry = ammoHits[ammo.id] ?? { itemId: ammo.id, name: ammo.name, ammoType, img: ammo.img, count: 0 };
    entry.name = ammo.name;
    entry.ammoType = ammoType;
    entry.img = ammo.img;
    entry.count += 1;
    ammoHits[ammo.id] = entry;

    await actor.setFlag(FLAG_SCOPE, "combat", {
      arrowsHit: (current.arrowsHit ?? 0) + (ammoType === AMMO_TYPES.ARROW ? 1 : 0),
      boltsHit: (current.boltsHit ?? 0) + (ammoType === AMMO_TYPES.BOLT ? 1 : 0),
      ammoHits
    });
  }

  static getTrackedHits(actor) {
    const combat = actor.getFlag(FLAG_SCOPE, "combat") ?? {};
    return {
      arrowsHit: Number(combat.arrowsHit ?? 0),
      boltsHit: Number(combat.boltsHit ?? 0),
      ammoHits: combat.ammoHits ?? {}
    };
  }

  static async recover(actor) {
    if (!TenebreSettings.get("enableAmmoRecovery")) return;

    const hits = this.getTrackedHits(actor);
    const totalHits = hits.arrowsHit + hits.boltsHit;
    if (totalHits <= 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Recovery.NoHits"));
      return;
    }

    const result = await rollRecovery(actor);
    if (!result) return;

    const percent = getRecoveryPercent(result.degree);
    const recoveredByItem = {};
    let totalRecovered = 0;

    for (const entry of Object.values(hits.ammoHits)) {
      const recovered = Math.floor((Number(entry.count) || 0) * percent / 100);
      if (recovered <= 0) continue;

      const item = actorItems(actor).find((candidate) => candidate.id === entry.itemId);
      if (item) {
        await changeItemQuantity(item, recovered);
      } else {
        await createRecoveredAmmo(actor, entry, recovered);
      }
      recoveredByItem[entry.name] = (recoveredByItem[entry.name] ?? 0) + recovered;
      totalRecovered += recovered;
    }

    await actor.setFlag(FLAG_SCOPE, "combat", {
      arrowsHit: 0,
      boltsHit: 0,
      ammoHits: {}
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: renderRecoveryMessage(actor, result, percent, recoveredByItem, totalRecovered)
    });
  }
}

async function rollRecovery(actor) {
  const attribute = TenebreSettings.get("recoveryAttribute");
  const target = Number(actor.system?.attributes?.[attribute]?.total ?? 0);
  if (!target) {
    ui.notifications.error(game.i18n.localize("TENEBRE.Recovery.InvalidAttribute"));
    return null;
  }

  const roll = await new Roll("1d20").evaluate();
  const value = roll.total;
  let degree = "failure";
  if (value <= target) degree = value === 1 ? "critical" : "success";

  return { attribute, target, roll, value, degree };
}

function getRecoveryPercent(degree) {
  if (degree === "critical") return Number(TenebreSettings.get("recoveryCritical")) || 0;
  if (degree === "success") return Number(TenebreSettings.get("recoverySuccess")) || 0;
  return Number(TenebreSettings.get("recoveryFailure")) || 0;
}

function renderRecoveryMessage(actor, result, percent, recoveredByItem, totalRecovered) {
  const rows = Object.entries(recoveredByItem)
    .map(([name, count]) => `<li>${escapeHtml(name)}: ${count}</li>`)
    .join("");
  const degree = game.i18n.localize(`TENEBRE.Recovery.${result.degree}`);
  const attribute = game.i18n.localize(actor.system.attributes[result.attribute].label);

  return `
    <div class="tenebre-chat-card">
      <h3>${game.i18n.localize("TENEBRE.Recovery.ChatTitle")}</h3>
      <p>${game.i18n.format("TENEBRE.Recovery.ChatRoll", {
        actor: escapeHtml(actor.name),
        attribute,
        roll: result.value,
        target: result.target,
        degree,
        percent
      })}</p>
      <p>${game.i18n.format("TENEBRE.Recovery.ChatRecovered", { total: totalRecovered })}</p>
      ${rows ? `<ul>${rows}</ul>` : ""}
    </div>
  `;
}

async function postAmmoCard(actor, ammo) {
  const description = getAmmoDescription(ammo);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="tenebre-chat-card">
        <h3>${game.i18n.format("TENEBRE.Ammo.UsesAmmo", {
          actor: foundry.utils.escapeHTML(actor.name),
          ammo: escapeHtml(ammo.name)
        })}</h3>
        <div class="tenebre-chat-item">
          <img src="${ammo.img}" alt="">
          <div>${description}</div>
        </div>
      </div>
    `
  });
}

async function createRecoveredAmmo(actor, entry, recovered) {
  const itemData = {
    name: entry.name,
    type: "equipment",
    img: entry.img ?? "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
    system: foundry.utils.deepClone(game.model.Item.equipment ?? {}),
    flags: {
      [FLAG_SCOPE]: {
        isAmmo: true,
        ammoType: entry.ammoType
      }
    }
  };
  itemData.system.number = recovered;
  await actor.createEmbeddedDocuments("Item", [itemData], { render: false });
}
