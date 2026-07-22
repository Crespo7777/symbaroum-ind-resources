export function opposedTargetModifier(displayedValue = "", rawAttribute = NaN) {
  const parsed = Number(displayedValue);
  if (displayedValue !== "" && Number.isFinite(parsed)) return parsed;
  const raw = Number(rawAttribute);
  return Number.isFinite(raw) ? 10 - raw : NaN;
}

export function effectiveRollValue(roll) {
  const text = cleanText(roll);
  if (!text) return "";
  return text.match(/-?\d+/)?.[0] ?? "";
}

export function protectionFromTotals(causedDamage, appliedDamage) {
  if (causedDamage === "" || appliedDamage === "" || causedDamage == null || appliedDamage == null) return "";
  const caused = Number(causedDamage);
  const applied = Number(appliedDamage);
  if (!Number.isFinite(caused) || !Number.isFinite(applied)) return "";
  return String(Math.max(0, caused - applied));
}

export function combatDamageSummary(message, value = "") {
  const formula = causedDamageFormula(value, message);
  return { formula, total: formula ? rawDamageTotal(message, formula) : NaN };
}

function causedDamageFormula(value, message = null) {
  return cleanText(damageRollFormula(message) || value)
    .replace(/\s+-\s+\([^)]*\).*$/, "")
    .replace(/\s+-\s+\d+.*$/, "")
    .trim();
}

function damageRollFormula(message) {
  const roll = findDamageRoll(message);
  return cleanText(roll?._formula ?? roll?.formula ?? "");
}

function findDamageRoll(message) {
  const rolls = flattenRolls(message?.rolls ?? []);
  const candidates = rolls.filter((roll) => (roll?.dice ?? []).some((die) => Number(die.faces) !== 20));
  const damageOnly = candidates.filter((roll) => !(roll?.dice ?? []).some((die) => Number(die.faces) === 20));
  const source = damageOnly.length ? damageOnly : candidates;
  source.sort((a, b) => scoreDamageRoll(b) - scoreDamageRoll(a));
  return source[0] ?? null;
}

function scoreDamageRoll(roll) {
  const formula = cleanText(roll?._formula ?? roll?.formula ?? "");
  const dice = roll?.dice ?? [];
  const nonD20Dice = dice.filter((die) => Number(die.faces) !== 20).length;
  const diceTerms = formula.match(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi)?.length ?? 0;
  const namedModifiers = formula.match(/\[[^\]]+\]/g)?.length ?? 0;
  const damageDiceTerms = formula.match(/\d+d(?!20\b)\d+(?:k[hl])?(?:\[[^\]]+\])?/gi)?.length ?? 0;
  return namedModifiers * 1000 + damageDiceTerms * 100 + diceTerms * 10 + nonD20Dice + formula.length / 1000;
}

function rawDamageTotal(message, formula) {
  const roll = findDamageRoll(message);
  if (!roll) return NaN;
  const rawFormula = cleanText(formula);
  const diceTerms = rawFormula.match(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi) ?? [];
  if (!diceTerms.length) {
    const numeric = Number(rawFormula.match(/-?\d+/)?.[0]);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  let total = 0;
  const damageDice = (roll.dice ?? []).filter((die) => Number(die.faces) !== 20).slice(0, diceTerms.length);
  for (const die of damageDice) {
    for (const result of die.results ?? []) {
      if (result.active === false) continue;
      total += Number(result.result) || 0;
    }
  }

  const numericModifier = rawFormula
    .replace(/\d+d\d+(?:k[hl])?(?:\[[^\]]+\])?/gi, "")
    .match(/[+-]\s*\d+\b/g)
    ?.reduce((sum, term) => sum + Number(term.replace(/\s+/g, "")), 0) ?? 0;
  return total + numericModifier || NaN;
}

function flattenRolls(rolls) {
  const found = [];
  const visit = (roll) => {
    if (!roll) return;
    if (roll.formula || roll.dice?.length) found.push(roll);
    for (const term of roll.terms ?? []) {
      for (const nested of term.rolls ?? []) visit(nested);
    }
  };
  for (const roll of rolls) visit(roll);
  return found;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
