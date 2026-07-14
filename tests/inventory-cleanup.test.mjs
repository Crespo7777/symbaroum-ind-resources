import assert from "node:assert/strict";
import {
  deleteDepletedInventoryItem,
  isDepletableInventoryItem,
  isDepletedInventoryItem,
  updateDepletesInventoryItem
} from "../scripts/inventory-cleanup.mjs";

const actor = { documentName: "Actor" };

assert.equal(isDepletableInventoryItem({ type: "equipment", parent: actor }), true);
assert.equal(isDepletableInventoryItem({ type: "weapon", parent: actor }), false);
assert.equal(isDepletableInventoryItem({ type: "equipment", parent: null }), false);

assert.equal(isDepletedInventoryItem({ type: "equipment", parent: actor, system: { number: 0 } }), true);
assert.equal(isDepletedInventoryItem({ type: "equipment", parent: actor, system: { number: -1 } }), true);
assert.equal(isDepletedInventoryItem({ type: "equipment", parent: actor, system: { number: 1 } }), false);
assert.equal(isDepletedInventoryItem({ type: "weapon", parent: actor, system: { number: 0 } }), false);

assert.equal(updateDepletesInventoryItem({ system: { number: 0 } }), true);
assert.equal(updateDepletesInventoryItem({ "system.number": -2 }), true);
assert.equal(updateDepletesInventoryItem({ system: { number: 1 } }), false);
assert.equal(updateDepletesInventoryItem({ name: "Changed" }), false);

let deleteCalls = 0;
const depletedItem = {
  id: "depleted",
  uuid: "Actor.actor.Item.depleted",
  type: "equipment",
  parent: actor,
  system: { number: 0 },
  async delete(options) {
    deleteCalls += 1;
    assert.deepEqual(options, { render: true });
  }
};

assert.equal(await deleteDepletedInventoryItem(depletedItem), true);
assert.equal(deleteCalls, 1);
assert.equal(await deleteDepletedInventoryItem({ ...depletedItem, type: "ritual" }), false);

console.log("inventory cleanup tests passed");
