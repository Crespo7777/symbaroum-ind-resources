const MANEUVER_EFFECT_PREFIX = "tenebre-maneuver-";
const MAX_BATCH_SIZE = 50;
const MAX_PAYLOAD_BYTES = 100_000;

export function assertSafeBatch(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_BATCH_SIZE) {
    throw new Error(`${label} must contain between 1 and ${MAX_BATCH_SIZE} entries.`);
  }
  assertSafePayload(values, label);
}

export function assertSafePayload(value, label) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch (_error) {
    throw new Error(`${label} must be serializable.`);
  }
  if (typeof serialized !== "string" || serialized.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`${label} exceeds the allowed payload size.`);
  }
}

export function isModuleManeuverEffect(source, moduleId) {
  const flags = source?.flags?.[moduleId];
  return flags?.maneuverEffect === true
    && String(flags.effectId ?? "").startsWith(MANEUVER_EFFECT_PREFIX);
}

export function isAllowedToughnessUpdate(updates, currentValue) {
  if (!isPlainObject(updates)) return false;
  const keys = Object.keys(updates);
  if (keys.length !== 1 || keys[0] !== "system.health.toughness.value") return false;

  const current = Number(currentValue);
  const next = Number(updates[keys[0]]);
  return Number.isFinite(current) && Number.isFinite(next) && next >= 0 && next <= current;
}

export function isAllowedCombatantUpdate(updates) {
  if (!isPlainObject(updates)) return false;
  const keys = Object.keys(updates);
  if (!keys.length || keys.some((key) => !["initiative", "defeated"].includes(key))) return false;
  if ("initiative" in updates && !Number.isFinite(Number(updates.initiative))) return false;
  if ("defeated" in updates && updates.defeated !== true) return false;
  return true;
}

export function sanitizeSocketOptions(options) {
  return { render: options?.render !== false };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
