import { AMMO_TYPES } from "./constants.mjs";
import { normalize } from "./utils.mjs";

const SPECIAL_AMMO = [
  {
    names: ["flecha de precisao", "precision arrow", "precision bolt", "precise arrow", "precise bolt"],
    ammoType: null,
    description: "<p><strong>Qualidade:</strong> Precisa.</p><p>Projétil especialmente equilibrado, feito para acertar seus alvos com mais facilidade.</p>"
  },
  {
    names: ["ponta perfurante de armadura", "armor piercing tip", "armor-piercing tip", "armor piercing arrow", "armor piercing bolt", "bodkin arrow", "bodkin bolt"],
    ammoType: null,
    description: "<p><strong>Qualidade:</strong> Impacto Profundo contra alvos com Armadura maior que 1.</p><p>A ponta facilita perfurar armaduras.</p>"
  },
  {
    names: ["sibilante", "whistler", "whistling arrow", "whistling bolt", "whistle arrow", "whistle bolt"],
    ammoType: null,
    description: "<p>A flecha assobia enquanto voa, funcionando como sinal para aliados.</p>"
  },
  {
    names: ["arpeu", "grappling arrow", "grappling bolt", "grapple arrow", "grapple bolt"],
    ammoType: null,
    description: "<p>Envia um gancho até 10 metros na vertical ou 30 metros na horizontal. Um fio de seda permite içar uma corda mais resistente até o gancho.</p>"
  },
  {
    names: ["cabeca de martelo", "hammer head", "hammerhead arrow", "hammerhead bolt", "blunt arrow", "blunt bolt"],
    ammoType: null,
    description: "<p>Após um acerto, role o dano normalmente, mas use o resultado para testar se o alvo fica atordoado: <strong>[Vigoroso - Dano]</strong>. Teste de Resistência do alvo: [[/r 1d20]] contra seu Vigoroso modificado pelo dano. Se falhar, o alvo não executa ações no próximo turno.</p>"
  },
  {
    names: ["cauda de andorinha", "swallowtail arrow", "swallowtail bolt", "swallow-tail arrow", "swallow-tail bolt"],
    ammoType: null,
    description: "<p>O alvo recebe +1D4 de bônus de Armadura contra este projétil, mas se sofrer dano sangra como descrito na qualidade Sangrenta.</p>"
  },
  {
    names: ["cortador de corda", "rope cutter", "rope-cutter arrow", "rope-cutter bolt", "rope cutting arrow", "rope cutting bolt"],
    ammoType: null,
    description: "<p>Ponta em forma de Y usada para cortar cordas. Acertar a corda é difícil: -5 no Teste de ataque; sucesso corta a corda.</p>"
  },
  {
    names: ["flecha flamejante", "flaming arrow", "flaming bolt"],
    ammoType: null,
    description: "<p><strong>Qualidade:</strong> Flamejante.</p><p>Projétil incendiário usado para atear fogo em criaturas, edifícios ou outros alvos inflamáveis.</p>"
  },
  {
    names: ["flecha de laco", "laço", "laco", "ensnaring arrow", "ensnaring bolt", "snare arrow", "snare bolt"],
    ammoType: null,
    description: "<p>Uma ponta farpada e um fio de seda prendem o alvo. Retirar exige uma Ação de Movimento e Teste de <strong>[Vigoroso - Dano]</strong>: [[/r 1d20]] contra seu Vigoroso modificado pelo dano. Se for bem-sucedido, sofre [[/r 1d4[Dano]]] de dano e a remove. Mover-se com a flecha presa causa 1 ponto de dano por turno, ignorando Armadura.</p>"
  },
  {
    names: ["flecha certeira", "true arrow"],
    ammoType: AMMO_TYPES.ARROW,
    description: "<p>Flecha alquímica que passa por outros combatentes, não exigindo linha de visão clara. O arqueiro ainda precisa ver alguma parte do alvo e fazer o Teste de ataque normalmente.</p>"
  },
  {
    names: ["raio atordoante", "stun bolt", "stunning bolt"],
    ammoType: AMMO_TYPES.BOLT,
    description: "<p>Virote coberto com relaxante muscular. A criatura atingida deve passar em <strong>[Vigoroso - Dano]</strong>: [[/r 1d20]] contra seu Vigoroso modificado pelo dano, ou cai no chão (ficando caida). Robusto concede +2 em Vigoroso por nível neste Teste.</p>"
  }
];

export function getSpecialAmmo(item) {
  const name = normalize(item?.name);
  return SPECIAL_AMMO.find((entry) => entry.names.some((alias) => name.includes(normalize(alias)))) ?? null;
}

export function getAmmoDescription(item) {
  const itemDescription = String(item?.system?.description ?? "").trim();
  if (itemDescription && itemDescription !== "<p></p>") return itemDescription;
  return getSpecialAmmo(item)?.description ?? "";
}

export function getSpecialAmmoType(item) {
  return getSpecialAmmo(item)?.ammoType ?? "";
}

/**
 * Parses special properties of ammunition to generate standard combat modifier structures.
 * @param {Item} ammo
 * @returns {Array<object>}
 */
export function getAmmoModifiers(ammo) {
  if (!ammo) return [];
  const name = normalize(ammo.name);
  const members = [];

  // 1. Precise Arrow / Bolt: +1 to hit
  const preciseNames = ["precisao", "precision", "precise"];
  if (preciseNames.some(p => name.includes(normalize(p)))) {
    members.push({
      id: ammo.id,
      label: ammo.name,
      reference: ammo.system?.reference ?? "",
      type: game.symbaroum.config.TYPE_ROLL_MOD, // "attackrollmod"
      modifier: 1,
      value: "1"
    });
  }

  // 2. Armor Piercing / Bodkin Arrow / Bolt: +1 damage (Deep Impact)
  const piercingNames = ["perfurante", "piercing", "bodkin"];
  if (piercingNames.some(p => name.includes(normalize(p)))) {
    members.push({
      id: ammo.id,
      label: `${ammo.name} (${game.i18n.localize("QUALITY.DEEPIMPACT")})`,
      reference: ammo.system?.reference ?? "",
      type: game.symbaroum.config.DAM_MOD, // "damagemodifier"
      value: "+1",
      alternatives: [
        {
          damageMod: "+1d1",
          damageModNPC: 1,
        }
      ]
    });
  }

  // 3. Flaming Arrow / Bolt: 1d4 burning damage per round
  const flamingNames = ["flamejante", "flaming", "burning"];
  if (flamingNames.some(p => name.includes(normalize(p)))) {
    members.push({
      id: ammo.id,
      label: `${ammo.name} (${game.i18n.localize("QUALITY.FLAMING")})`,
      reference: ammo.system?.reference ?? "",
      type: game.symbaroum.config.STATUS_DOT, // "status_dot"
      value: game.i18n.localize("QUALITY.FLAMING"),
      damagePerRound: "1d4",
      damagePerRoundNPC: 2,
      duration: "1d4",
      durationNPC: 2,
      effectIcon: CONFIG.statusEffects?.find((e) => e.id === "burning") ?? {
        id: "burning",
        name: "Burning",
        icon: "icons/svg/fire.svg"
      }
    });
  }

  return members;
}

