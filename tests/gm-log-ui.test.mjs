import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GM_LOG_EVENT_TYPES } from "../scripts/gm-log-events.mjs";
import {
  filterGmLogEvents,
  formatGmLogEvent,
  normalizeGmLogWindowPosition
} from "../scripts/gm-log-ui.mjs";

function event({ id, type, category, outcome = "info", occurredAt = 1_000 }) {
  return {
    eventId: id,
    type,
    category,
    outcome,
    occurredAt,
    actor: { name: "Crespo" },
    target: { name: "Elfo" },
    subject: { name: "Arco" },
    source: { messageId: id, variant: "single" },
    values: { roll: 7 }
  };
}

test("filters events without mutating the service snapshot", () => {
  const events = [
    event({ id: "attack", type: GM_LOG_EVENT_TYPES.ATTACK, category: "combat" }),
    event({ id: "roll", type: GM_LOG_EVENT_TYPES.ROLL, category: "rolls" })
  ];

  const all = filterGmLogEvents(events, "all");
  const combat = filterGmLogEvents(events, "combat");

  assert.notEqual(all, events);
  assert.deepEqual(all.map((entry) => entry.eventId), ["attack", "roll"]);
  assert.deepEqual(combat.map((entry) => entry.eventId), ["attack"]);
  assert.deepEqual(filterGmLogEvents(events, "unknown").map((entry) => entry.eventId), ["attack", "roll"]);
});

test("formats compact rows through localization without injecting HTML", () => {
  const input = event({
    id: "attack",
    type: GM_LOG_EVENT_TYPES.ATTACK,
    category: "combat",
    outcome: "success",
    occurredAt: 2_000
  });
  const calls = [];
  const result = formatGmLogEvent(input, {
    localize: (key, data) => {
      calls.push({ key, data });
      return `${data.actor} > ${data.target}`;
    },
    formatTime: () => "12:34"
  });

  assert.equal(result.text, "Crespo > Elfo");
  assert.equal(result.time, "12:34");
  assert.equal(result.category, "combat");
  assert.equal(calls[0].key, "TENEBRE.GmLog.Attack.Success");
});

test("normalizes a stored GM log position inside the current viewport", () => {
  assert.deepEqual(normalizeGmLogWindowPosition({
    version: 1,
    left: 120,
    top: 80,
    width: 600,
    height: 400
  }, { width: 1280, height: 720 }), {
    left: 120,
    top: 80,
    width: 600,
    height: 400
  });

  assert.deepEqual(normalizeGmLogWindowPosition({
    version: 1,
    left: 2000,
    top: -100,
    width: 1400,
    height: 900
  }, { width: 1280, height: 720 }), {
    left: 16,
    top: 16,
    width: 1248,
    height: 688
  });
});

test("rejects invalid or unsupported stored GM log positions", () => {
  assert.equal(normalizeGmLogWindowPosition({}, { width: 1280, height: 720 }), null);
  assert.equal(normalizeGmLogWindowPosition({
    version: 2,
    left: 10,
    top: 10,
    width: 520,
    height: 480
  }, { width: 1280, height: 720 }), null);
  assert.equal(normalizeGmLogWindowPosition({
    version: 1,
    left: "invalid",
    top: 10,
    width: 520,
    height: 480
  }, { width: 1280, height: 720 }), null);
});

test("UI lifecycle is GM-only, idempotent and does not create chat documents", async () => {
  const source = await readFile(new URL("../scripts/gm-log-ui.mjs", import.meta.url), "utf8");
  const template = await readFile(new URL("../templates/gm-log.hbs", import.meta.url), "utf8");
  assert.match(source, /!game\.user\?\.isGM/);
  assert.match(source, /Hooks\.on\("renderChatLog"/);
  assert.match(source, /resolveChatControls\(host\)/);
  assert.match(source, /document\.getElementById\("chat-controls"\)/);
  assert.match(source, /controls\.querySelector\(":scope > #roll-privacy"\)/);
  assert.match(source, /rollPrivacy\.append\(toggle\)/);
  assert.match(source, /controls\.insertBefore\(toggle, nativeControls \?\? null\)/);
  assert.match(source, /document\.getElementById\(TOGGLE_ID\)/);
  assert.match(source, /const TOGGLE_ICON = "fa-solid fa-list-ul"/);
  assert.match(source, /HandlebarsApplicationMixin\(ApplicationV2\)/);
  assert.match(source, /resizable: true/);
  assert.match(source, /_onPosition\(position\)/);
  assert.match(source, /POSITION_SAVE_DELAY_MS/);
  assert.match(source, /game\.settings\.set\(MODULE_ID, POSITION_SETTING, next\)/);
  assert.match(source, /const storedPosition = readStoredWindowPosition\(\)/);
  assert.match(source, /if \(storedPosition\) applicationOptions\.position = storedPosition/);
  assert.match(source, /this\.#application\.render\(\{ force: true \}\)/);
  assert.match(source, /await this\.#application\.close\(\)/);
  assert.match(source, /onVisibilityChange/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(template, /tenebre-gm-log-list/);
  assert.match(template, /data-action="clear-log"/);
  assert.doesNotMatch(source, /tenebre-gm-log-detached/);
  assert.doesNotMatch(source, /appendChild\(panel\)/);
  assert.doesNotMatch(source, /fa-chevron-(?:left|right)/);
  assert.doesNotMatch(source, /ChatMessage\.create/);
  assert.doesNotMatch(source, /game\.socket/);
});
