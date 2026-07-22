import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findMatchingClone } from "../scripts/chat-original-preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function branch(...children) {
  const node = { children };
  for (const child of children) child.parentElement = node;
  return node;
}

test("original message highlights resolve to the corresponding cloned element", () => {
  const omitted = branch();
  const source = branch(branch(), branch(branch(), omitted));
  const clonedOmitted = branch();
  const preview = branch(branch(), branch(branch(), clonedOmitted));

  assert.equal(findMatchingClone(source, preview, omitted), clonedOmitted);
  assert.equal(findMatchingClone(source, preview, branch()), null);
});

test("original preview styles identify omitted information and reveal dice details", () => {
  const script = read("scripts/chat-original-preview.mjs");
  const css = read("styles/symbaroum-ind-resources.css");
  const ptBr = JSON.parse(read("languages/pt-BR.json"));

  assert.match(script, /tenebre-original-chat-omitted/);
  assert.match(script, /TENEBRE\.ChatOriginal\.NotShown/);
  assert.match(css, /\.tenebre-original-chat-preview \.tenebre-original-chat-omitted\s*\{[\s\S]*?outline:\s*2px solid #b52323;/);
  assert.match(css, /\.dice-tooltip\.tenebre-original-chat-omitted\s*\{[\s\S]*?display:\s*block !important;/);
  assert.equal(ptBr["TENEBRE.ChatOriginal.NotShown"], "Destacado: informação não exibida no cartão do Ind Resources.");
});
