import { AMMO_TYPES, FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { actorItems, changeItemQuantity, findAmmoItems, getAmmoType, itemQuantity, localizeAmmoType, isQuiver, isAmmo, getQuiverLoadedAmmo, getQuiverLoadedTotal } from "./item-flags.mjs";
import { getAmmoDescription, getSpecialAmmo, getAmmoRecoveryThreshold } from "./special-ammo.mjs";
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
    if (ammo.isVirtual) {
      const quiver = actor.items.get(ammo.quiverId);
      if (quiver) {
        const loadedAmmo = getQuiverLoadedAmmo(quiver);
        const entryIndex = loadedAmmo.findIndex(e => e.name === ammo.name || e.id === ammo.loadedEntryId);
        if (entryIndex !== -1) {
          const entry = loadedAmmo[entryIndex];
          if (entry.quantity > 1) {
            entry.quantity -= 1;
            ui.notifications.info(game.i18n.format("TENEBRE.Ammo.UsesAmmo", {
              actor: actor.name,
              ammo: entry.name
            }) + ` (${entry.quantity}/12)`);
          } else {
            loadedAmmo.splice(entryIndex, 1);
            ui.notifications.info(game.i18n.format("TENEBRE.Ammo.UsesAmmo", {
              actor: actor.name,
              ammo: entry.name
            }) + ` (0/12)`);
          }
          await quiver.setFlag(FLAG_SCOPE, "loadedAmmo", loadedAmmo);
        }
      }
    } else if (isQuiver(ammo)) {
      const looseAmmoItems = actorItems(actor).filter(
        (item) => isAmmo(item) &&
                  getAmmoType(item) === ammoType &&
                  !isQuiver(item) &&
                  !getSpecialAmmo(item) &&
                  itemQuantity(item) > 0
      );

      if (looseAmmoItems.length > 0) {
        const looseItem = looseAmmoItems[0];
        await changeItemQuantity(looseItem, -1);
        const looseName = looseItem.name.toLowerCase().includes("virote") || looseItem.name.toLowerCase().includes("bolt") ? "virote avulso" : "flecha avulsa";
        ui.notifications.info(`Gastou 1 projétil da aljava (consumiu 1 ${looseName} do inventário).`);
      } else {
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

  static async reloadQuiverPrompt(actor, quiverItem) {
    const currentTotal = getQuiverLoadedTotal(quiverItem);
    const remainingCapacity = 12 - currentTotal;
    if (remainingCapacity <= 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Ammo.ReloadFull"));
      return;
    }

    const looseAmmoItems = actorItems(actor).filter(
      (item) => isAmmo(item) && !isQuiver(item) && itemQuantity(item) > 0
    );

    if (looseAmmoItems.length === 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Ammo.ReloadNoAmmo"));
      return;
    }

    const optionsHtml = looseAmmoItems.map((item) => {
      return `<option value="${item.id}">${item.name} (${itemQuantity(item)})</option>`;
    }).join("");

    const firstItem = looseAmmoItems[0];
    const initialMax = Math.min(remainingCapacity, itemQuantity(firstItem));

    const content = `
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
          ${game.i18n.localize("TENEBRE.Ammo.ReloadChooseAmmo")}:
        </label>
        <select name="ammoId" style="width: 100%; height: 28px;">
          ${optionsHtml}
        </select>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
          ${game.i18n.localize("TENEBRE.Ammo.ReloadQuantity")}:
        </label>
        <input type="number" name="quantity" value="${initialMax}" min="1" max="${initialMax}" style="width: 100%; height: 24px;">
      </div>
      <div style="font-style: italic; color: #555;">
        ${game.i18n.format("TENEBRE.Ammo.ReloadRemainingCapacity", { remaining: remainingCapacity })}
      </div>
    `;

    const result = await new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("TENEBRE.Ammo.ReloadTitle"),
        content: content,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("TENEBRE.Common.Confirm") || "Confirmar",
            callback: (html) => {
              const ammoId = html.find('[name="ammoId"]').val();
              const quantity = parseInt(html.find('[name="quantity"]').val()) || 0;
              resolve({ ammoId, quantity });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("TENEBRE.Common.Cancel") || "Cancelar",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        render: (html) => {
          const select = html.find('[name="ammoId"]');
          const input = html.find('[name="quantity"]');
          const updateMax = () => {
            const selectedId = select.val();
            const selectedItem = looseAmmoItems.find(i => i.id === selectedId);
            if (selectedItem) {
              const available = itemQuantity(selectedItem);
              const maxToLoad = Math.min(remainingCapacity, available);
              input.attr("max", maxToLoad);
              if (parseInt(input.val()) > maxToLoad) {
                input.val(maxToLoad);
              }
            }
          };
          select.on("change", updateMax);
        },
        close: () => resolve(null)
      }).render(true);
    });

    if (!result) return;

    const { ammoId, quantity } = result;
    const looseItem = actor.items.get(ammoId);
    if (!looseItem) return;

    const finalQty = Math.min(quantity, remainingCapacity, itemQuantity(looseItem));
    if (finalQty <= 0) return;

    // Consome munição avulsa
    await changeItemQuantity(looseItem, -finalQty);

    // Adiciona na aljava
    const loadedAmmo = getQuiverLoadedAmmo(quiverItem);
    let entry = loadedAmmo.find(e => e.name === looseItem.name);
    if (entry) {
      entry.quantity = (Number(entry.quantity) || 0) + finalQty;
    } else {
      entry = {
        id: looseItem.id,
        name: looseItem.name,
        quantity: finalQty,
        img: looseItem.img
      };
      loadedAmmo.push(entry);
    }

    await quiverItem.setFlag(FLAG_SCOPE, "loadedAmmo", loadedAmmo);
    ui.notifications.info(game.i18n.format("TENEBRE.Ammo.ReloadSuccess", {
      loaded: finalQty,
      ammo: looseItem.name
    }));

    const actorImg = actor.img || actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg";
    const ammoImg = looseItem.img || "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp";
    const quiverImg = quiverItem.img || "icons/containers/bags/quiver-leather-tan.webp";

    const chatContent = `
      <div class="tenebre-chat-card tenebre-reload-card">
        <div class="tenebre-chat-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <img src="${actorImg}" style="width: 32px; height: 32px; border-radius: 4px; border: 1px solid #7a7973;" alt="${escapeHtml(actor.name)}">
          <h3 style="margin: 0; font-size: 1.1em; line-height: 1.2; font-weight: bold; border-bottom: none;">
            ${game.i18n.format("TENEBRE.Ammo.ReloadChatTitle", { actor: escapeHtml(actor.name) })}
          </h3>
        </div>
        <div class="tenebre-chat-item" style="display: flex; align-items: center; gap: 10px; padding: 6px; border: 1px dashed #7a7973; background: rgba(0,0,0,0.05); border-radius: 4px;">
          <img src="${ammoImg}" style="width: 28px; height: 28px; border: none; background: transparent;" alt="">
          <div style="flex: 1; font-size: 0.95em;">
            <strong>${finalQty}x</strong> ${escapeHtml(looseItem.name)} <br>
            <span style="font-size: 0.85em; color: #555;">
              ${game.i18n.localize("TENEBRE.Ammo.ReloadChatTarget")} <strong>${escapeHtml(quiverItem.name)}</strong> (${getQuiverLoadedTotal(quiverItem)}/12)
            </span>
          </div>
          <img src="${quiverImg}" style="width: 28px; height: 28px; border: none; background: transparent;" alt="">
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: chatContent
    });
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

    // Registra acertos apenas se o personagem estiver em um combate iniciado
    const inCombat = game.combat?.started && game.combat.combatants.some(c => c.actorId === actor.id);
    if (!inCombat) return;

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
      ammoHit: (current.ammoHit ?? 0) + 1,
      ammoHits
    });
  }

  static getTrackedHits(actor) {
    const combat = actor.getFlag(FLAG_SCOPE, "combat") ?? {};
    const ammoHit = combat.ammoHit !== undefined
      ? Number(combat.ammoHit ?? 0)
      : (Number(combat.arrowsHit ?? 0) + Number(combat.boltsHit ?? 0));
    return {
      ammoHit,
      ammoHits: combat.ammoHits ?? {}
    };
  }

  static async recover(actor) {
    if (!TenebreSettings.get("enableAmmoRecovery")) return;

    const hits = this.getTrackedHits(actor);
    const totalHits = hits.ammoHit;
    if (totalHits <= 0) {
      ui.notifications.warn(game.i18n.localize("TENEBRE.Recovery.NoHits"));
      return;
    }

    const recoveredByItem = {};
    let totalRecovered = 0;
    const chatDetails = [];

    for (const entry of Object.values(hits.ammoHits)) {
      const shotCount = Number(entry.count) || 0;
      if (shotCount <= 0) continue;

      const threshold = getAmmoRecoveryThreshold(entry.name);
      let recoveredCount = 0;
      const rolls = [];

      for (let i = 0; i < shotCount; i++) {
        const roll = Math.floor(Math.random() * 20) + 1;
        const success = roll <= threshold;
        if (success) {
          recoveredCount++;
          rolls.push({ val: roll, status: "recovered", label: "Recuperada" });
        } else {
          rolls.push({ val: roll, status: "broken", label: "Quebrada" });
        }
      }

      if (recoveredCount > 0) {
        const item = actorItems(actor).find((candidate) => candidate.id === entry.itemId || (candidate.name === entry.name && isAmmo(candidate) && !isQuiver(candidate)));
        if (item) {
          await changeItemQuantity(item, recoveredCount);
        } else {
          await createRecoveredAmmo(actor, entry, recoveredCount);
        }
        recoveredByItem[entry.name] = recoveredCount;
        totalRecovered += recoveredCount;
      }

      const rollsHtml = rolls.map(r => {
        const color = r.status === "recovered" ? "#2e7d32" : "#c62828";
        const strike = r.status === "broken" ? "text-decoration: line-through; opacity: 0.6;" : "";
        const bg = r.status === "recovered" ? "rgba(46, 125, 50, 0.1)" : "rgba(198, 40, 40, 0.1)";
        return `<span style="display: inline-block; padding: 2px 6px; margin: 2px; border: 1px solid ${color}; background: ${bg}; border-radius: 3px; font-weight: bold; color: ${color}; ${strike}" title="${r.label}">${r.val}</span>`;
      }).join(" ");

      let typeLabel = "Comum";
      if (threshold === 15) typeLabel = "Qualidade";
      else if (threshold === 17) typeLabel = "Mística";

      chatDetails.push(`
        <div style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 4px;">
          <strong>${escapeHtml(entry.name)}</strong> (${typeLabel} - Limite: &le; ${threshold})<br>
          <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 2px;">${rollsHtml}</div>
          <span style="font-size: 0.9em; color: #555;">
            Atirados: ${shotCount} | Recuperados: ${recoveredCount} | Quebrados: ${shotCount - recoveredCount}
          </span>
        </div>
      `);
    }

    await actor.setFlag(FLAG_SCOPE, "combat", {
      arrowsHit: 0,
      boltsHit: 0,
      ammoHit: 0,
      ammoHits: {}
    });

    const chatContent = `
      <div class="tenebre-chat-card tenebre-recovery-card">
        <h3 style="margin-bottom: 5px; border-bottom: 1px solid #7a7973; font-weight: bold;">
          ${game.i18n.localize("TENEBRE.Recovery.ChatTitle")}
        </h3>
        <p style="margin: 0 0 5px 0;">
          ${game.i18n.format("TENEBRE.Recovery.NewChatRoll", {
            actor: escapeHtml(actor.name),
            total: totalRecovered
          })}
        </p>
        ${chatDetails.join("")}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: chatContent
    });
  }
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
