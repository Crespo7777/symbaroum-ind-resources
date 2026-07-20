import assert from "node:assert/strict";
import test from "node:test";

globalThis.game = { user: { isGM: true } };
globalThis.Hooks = { on() {} };

const { ContainerTransferService } = await import("../scripts/container-transfer.mjs");

const scope = "symbaroum-ind-resources";

function createCollection(items = []) {
  const collection = new Map(items.map((item) => [item.id, item]));
  collection[Symbol.iterator] = function* iterator() {
    yield* this.values();
  };
  return collection;
}

function createItem({ id, name, storedIn = "", type = "equipment" }) {
  const item = {
    id,
    _id: id,
    name,
    type,
    parent: null,
    system: { number: 1, state: "equipped" },
    flags: {
      [scope]: storedIn ? { storedIn, storedInName: "Mochila" } : {}
    },
    getFlag(flagScope, key) {
      return this.flags?.[flagScope]?.[key];
    },
    toObject() {
      return {
        _id: this.id,
        name: this.name,
        type: this.type,
        system: { ...this.system },
        flags: structuredClone(this.flags)
      };
    }
  };
  return item;
}

function createActor(items) {
  const actor = {
    id: "actor-1",
    uuid: "Actor.actor-1",
    type: "player",
    isOwner: true,
    items: createCollection(items)
  };
  for (const item of items) item.parent = actor;
  return actor;
}

test("Item Piles transfer hook moves the complete container tree", () => {
  const root = createItem({ id: "root-1", name: "Mochila" });
  const child = createItem({ id: "child-1", name: "Corda", storedIn: root.id });
  const sourceActor = createActor([root, child]);
  const targetActor = createActor([]);
  const targetCreates = [{
    _id: "root-target",
    name: "Mochila",
    type: "equipment",
    system: { number: 1 },
    flags: {}
  }];
  const sourceUpdates = {
    itemsToDelete: [root.id],
    itemDeltas: [{ item: { _id: root.id }, quantity: -1 }]
  };

  assert.equal(ContainerTransferService.handleItemPilePreTransfer(
    sourceActor,
    sourceUpdates,
    targetActor,
    { itemsToCreate: targetCreates }
  ), true);

  assert.equal(targetCreates.length, 2);
  assert.equal(targetCreates[0]._id, "root-target");
  assert.equal(targetCreates[1].flags[scope].storedIn, "root-target");
  assert.deepEqual(sourceUpdates.itemsToDelete.sort(), ["child-1", "root-1"]);
});

test("Item Piles hook trusts Item Piles authorization for a GM-owned target pile", () => {
  const root = createItem({ id: "root-1", name: "Mochila" });
  const child = createItem({ id: "child-1", name: "Corda", storedIn: root.id });
  const sourceActor = createActor([root, child]);
  const targetActor = createActor([]);
  targetActor.isOwner = false;
  const previousIsGM = globalThis.game.user.isGM;
  globalThis.game.user.isGM = false;

  try {
    assert.equal(ContainerTransferService.handleItemPilePreTransfer(
      sourceActor,
      {
        itemsToDelete: [root.id],
        itemDeltas: [{ item: { _id: root.id }, quantity: -1 }]
      },
      targetActor,
      { itemsToCreate: [{ _id: "root-target", name: "Mochila", type: "equipment" }] }
    ), true);
  } finally {
    globalThis.game.user.isGM = previousIsGM;
  }
});

test("Item Piles transfer hook rejects a partial container transfer", () => {
  const root = createItem({ id: "root-1", name: "Mochila" });
  const child = createItem({ id: "child-1", name: "Corda", storedIn: root.id });
  const sourceActor = createActor([root, child]);

  assert.equal(ContainerTransferService.handleItemPilePreTransfer(
    sourceActor,
    { itemsToDelete: [], itemDeltas: [{ item: { _id: root.id }, quantity: -1 }] },
    createActor([]),
    { itemsToCreate: [] }
  ), false);
});

test("Item Piles transfer hook rejects moving a stored child by itself", () => {
  const root = createItem({ id: "root-1", name: "Mochila" });
  const child = createItem({ id: "child-1", name: "Corda", storedIn: root.id });
  const sourceActor = createActor([root, child]);

  assert.equal(ContainerTransferService.handleItemPilePreTransfer(
    sourceActor,
    { itemsToDelete: [child.id], itemDeltas: [{ item: { _id: child.id }, quantity: -1 }] },
    createActor([]),
    { itemsToCreate: [] }
  ), false);
});
