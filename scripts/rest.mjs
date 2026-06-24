import { FLAG_SCOPE } from "./constants.mjs";
import { TenebreSettings } from "./settings.mjs";
import { escapeHtml } from "./utils.mjs";

// Gerenciamento de descanso de personagens
export class RestService {
  // Abre diálogo de descanso para o ator
  static async openRestDialog(actor) {
    const defaultHealing = Number(TenebreSettings.get("restHealing")) || 1;

    const content = `
      <div class="tenebre-rest-dialog">
        <div class="tenebre-rest-actor">
          <strong>${escapeHtml(actor.name)}</strong>
        </div>
        <div class="tenebre-rest-row">
          <label for="tenebre-days">${game.i18n.localize("TENEBRE.Rest.Days")}</label>
          <input type="number" id="tenebre-days" name="days" value="1" min="1" max="30" style="width:80px">
        </div>
        <div class="tenebre-rest-row">
          <label for="tenebre-healing">${game.i18n.localize("TENEBRE.Rest.HealingPerDay")}</label>
          <input type="number" id="tenebre-healing" name="healing" value="${defaultHealing}" min="0" max="100" style="width:80px">
        </div>
      </div>
    `;

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TENEBRE.Rest.DialogTitle") },
      content,
      ok: {
        icon: "fas fa-bed",
        label: game.i18n.localize("TENEBRE.Rest.Confirm"),
        callback: (_event, _button, dialog) => {
          return {
            days: Number(dialog.element.querySelector("#tenebre-days")?.value) || 1,
            healing: Number(dialog.element.querySelector("#tenebre-healing")?.value) ?? 1
          };
        }
      },
      rejectClose: false
    });

    if (result == null) return;
    await RestService.applyRest(actor, result.days, result.healing);
  }

  // Aplica efeitos de descanso (recuperação de vitalidade, remoção de corrupção temporária e resets de morte)
  static async applyRest(actor, days = 1, healingPerDay = null) {
    const updates = {};
    const results = { days, actorName: actor.name, healed: 0, corruptionCleared: 0, hungerResults: [] };

    // Zera os testes de morte falhos
    updates["system.nbrOfFailedDeathRoll"] = 0;

    // Verifica status de fome
    const hasHunger = actor.effects.some(e => e.statuses?.has?.("hunger") || e.statuses?.has?.("fome") || e.name === "Fome" || e.name === "Hunger");

    // Recuperação de vitalidade
    let finalHealing = healingPerDay !== null
      ? healingPerDay
      : (TenebreSettings.get("enableRestHealing") ? (Number(TenebreSettings.get("restHealing")) || 0) : 0);

    if (hasHunger) {
      finalHealing = 0;
    }

    if (finalHealing > 0) {
      const totalHealing = finalHealing * days;
      const current = Number(actor.system?.health?.toughness?.value ?? 0);
      const max = Number(actor.system?.health?.toughness?.max ?? current);
      const next = Math.min(max, current + totalHealing);
      const healed = next - current;
      if (healed > 0) {
        updates["system.health.toughness.value"] = next;
        results.healed = healed;
      }
    }

    // Testes diários de Vigoroso por inanição
    if (hasHunger) {
      let currentStrong = Number(actor.system?.attributes?.strong?.value ?? 0);
      const strongBonus = Number(actor.system?.attributes?.strong?.bonus ?? 0);
      const strongTemp = Number(actor.system?.attributes?.strong?.temporaryMod ?? 0);

      for (let d = 1; d <= days; d++) {
        const target = currentStrong + strongBonus + strongTemp;
        // Rolagem com desvantagem (dois testes e escolhe o pior)
        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        const rollValue = Math.max(roll1, roll2);
        const success = rollValue <= target;

        let effectMsg = "";
        if (!success) {
          currentStrong = Math.max(0, currentStrong - 1);
          effectMsg = `Falhou! Vigoroso diminuído em -1 (Novo base: ${currentStrong})`;
          updates["system.attributes.strong.value"] = currentStrong;
        } else {
          effectMsg = "Passou no teste!";
        }

        results.hungerResults.push({
          day: d,
          rolls: [roll1, roll2],
          selectedRoll: rollValue,
          target,
          success,
          effectMsg,
          dead: currentStrong === 0
        });

        if (currentStrong === 0) {
          break;
        }
      }
    }

    // Limpa corrupção temporária se sobreviveu
    const survived = !results.hungerResults.some(hr => hr.dead);
    if (days >= 1 && survived) {
      const corruption = Number(actor.system?.health?.corruption?.temporary ?? 0);
      if (corruption > 0) {
        updates["system.health.corruption.temporary"] = 0;
        results.corruptionCleared = corruption;
      }
    }

    await actor.update(updates);
    await RestService.#postRestMessage(actor, results);
  }

  // Envia mensagem de chat resumindo descanso
  static async #postRestMessage(actor, results) {
    const lines = [];
    if (results.healed > 0) {
      lines.push(game.i18n.format("TENEBRE.Rest.ChatHealed", { amount: results.healed }));
    }
    if (results.corruptionCleared > 0) {
      lines.push(game.i18n.format("TENEBRE.Rest.ChatCorruptionCleared", { amount: results.corruptionCleared }));
    }

    if (results.hungerResults && results.hungerResults.length > 0) {
      lines.push(`<li style="list-style: none; margin-left: -15px; font-weight: bold; color: #c62828; margin-top: 8px;">
        <i class="fas fa-drumstick-bite"></i> Testes de Inanição (Fome):
      </li>`);
      for (const hr of results.hungerResults) {
        const statusColor = hr.success ? "#2e7d32" : "#c62828";
        const rollsStr = `[${hr.rolls[0]}, ${hr.rolls[1]}] &rarr; <strong>${hr.selectedRoll}</strong>`;
        lines.push(`<li style="font-size: 0.9em; margin-bottom: 4px; list-style: none; margin-left: -10px;">
          Dia ${hr.day}: Rolou ${rollsStr} contra Vigoroso ${hr.target}. <span style="color: ${statusColor}; font-weight: bold;">${hr.effectMsg}</span>
          ${hr.dead ? `<br><strong style="color: #c62828; text-transform: uppercase;"><i class="fas fa-skull"></i> O personagem morreu por inanição!</strong>` : ""}
        </li>`);
      }
    } else {
      if (lines.length === 0) {
        lines.push(game.i18n.localize("TENEBRE.Rest.ChatNoEffect"));
      }
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="tenebre-chat-card">
          <h3>${game.i18n.format("TENEBRE.Rest.ChatTitle", {
            actor: escapeHtml(results.actorName),
            days: results.days
          })}</h3>
          <ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>
        </div>
      `
    });
  }
}
