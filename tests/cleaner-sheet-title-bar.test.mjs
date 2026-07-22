import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { CompatibilityService } from "../scripts/compatibility.mjs";

const css = fs.readFileSync(new URL("../styles/symbaroum-ind-resources.css", import.meta.url), "utf8");

test("Cleaner Sheet Title Bar compatibility follows the active module state", () => {
  const classes = new Set();
  const originalDocument = globalThis.document;
  const originalGame = globalThis.game;

  globalThis.document = {
    documentElement: {
      classList: {
        toggle(name, active) {
          if (active) classes.add(name);
          else classes.delete(name);
        }
      }
    }
  };
  globalThis.game = {
    modules: new Map([["cleaner-sheet-title-bar", { active: true }]])
  };

  try {
    assert.equal(CompatibilityService.applySheetTitleBarCompatibility(), true);
    assert.equal(classes.has("tenebre-cleaner-sheet-title-bar-active"), true);

    globalThis.game.modules.get("cleaner-sheet-title-bar").active = false;
    assert.equal(CompatibilityService.applySheetTitleBarCompatibility(), false);
    assert.equal(classes.has("tenebre-cleaner-sheet-title-bar-active"), false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.game = originalGame;
  }
});

test("Cleaner compatibility hides header labels immediately but restores icon size", () => {
  assert.match(
    css,
    /html\.tenebre-cleaner-sheet-title-bar-active header\.window-header a:not\(\.document-id-link\)\s*\{[^}]*font-size:\s*0\s*!important;/s
  );
  assert.match(
    css,
    /html\.tenebre-cleaner-sheet-title-bar-active header\.window-header a:not\(\.document-id-link\) i\s*\{[^}]*font-size:\s*var\(--font-size-14, 14px\)\s*!important;/s
  );
});
