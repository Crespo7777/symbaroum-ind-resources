import { FLAG_SCOPE, MODULE_ID } from "./constants.mjs";
import { ContainerService } from "./containers.mjs";

const GROUND_CONTAINER_FLAG = "groundContainer";
const GROUND_CONTAINER_STATE = "other";
const GROUND_CONTAINER_VERSION = 1;
const ITEM_PILES_PRE_TRANSFER_HOOK = "preTransferItems";

let hooksRegistered = false;
const pendingGroundTargets = new Map();

export class ContainerTransferService {
  static registerHooks() {
    if (hooksRegistered || !getItemPilesApi()) return false;

    const hookName = getItemPilesPreTransferHook();
    if (!hookName || typeof globalThis.Hooks?.on !== "function") return false;

    globalThis.Hooks.on(hookName, (sourceActor, sourceUpdates, targetActor, targetUpdates, interactionId) => {
      return this.handleItemPilePreTransfer(sourceActor, sourceUpdates, targetActor, targetUpdates, interactionId);
    });
    hooksRegistered = true;
    return true;
  }

  static async handleActorItemDrop(targetActor, droppedItem) {
    const resolvedItem = droppedItem?.parent ? droppedItem : await resolveUuid(droppedItem?.uuid);
    const sourceActor = resolvedItem?.parent;
    if (!sourceActor?.items || !targetActor?.items || !ContainerService.isContainer(resolvedItem)) {
      return { handled: false, result: undefined };
    }

    if (sourceActor.uuid === targetActor.uuid) {
      return { handled: true, result: false };
    }
    if (!canTransferActors(sourceActor, targetActor)) {
      return { handled: true, result: false };
    }
    if (ContainerService.isStored(resolvedItem)) {
      return { handled: true, result: false };
    }

    return {
      handled: true,
      result: await this.transferBetweenActors(sourceActor, targetActor, resolvedItem)
    };
  }

  static async transferBetweenActors(sourceActor, targetActor, rootContainer, { targetGroundReference = null } = {}) {
    if (!isTopLevelContainer(rootContainer) || !canTransferActors(sourceActor, targetActor)) return false;

    const tree = collectContainerTree(sourceActor, rootContainer);
    const created = [];
    const idMap = new Map();

    try {
      for (const item of tree) {
        const data = buildTransferredItemData(item, idMap, item.id === rootContainer.id);
        const parentId = getStoredIn(item);
        if (parentId && !idMap.has(parentId)) throw new Error(`Missing parent mapping for item ${item.id}`);

        const [createdItem] = await targetActor.createEmbeddedDocuments("Item", [data], { render: false });
        if (!createdItem?.id) throw new Error(`Target actor did not create item ${item.name}`);
        idMap.set(item.id, createdItem.id);
        created.push(createdItem);
      }

      const targetRoot = created[0];
      if (targetGroundReference) {
        await targetRoot.update({
          "system.state": GROUND_CONTAINER_STATE,
          [`flags.${FLAG_SCOPE}.${GROUND_CONTAINER_FLAG}`]: {
            ...targetGroundReference,
            containerId: targetRoot.id,
            previousState: rootPreviousState(rootContainer)
          }
        }, { render: false });
      }

      for (const item of tree) {
        if (ContainerService.isContainer(item)) ContainerService.allowDeleteWithTransferredContents(item);
      }
      await sourceActor.deleteEmbeddedDocuments("Item", tree.map((item) => item.id), {
        render: false,
        [MODULE_ID]: { preserveContents: true }
      });
    } catch (error) {
      await deleteCreatedItems(targetActor, created);
      throw error;
    }

    rerenderActor(targetActor);
    rerenderActor(sourceActor);
    return true;
  }

  static handleItemPilePreTransfer(sourceActor, sourceUpdates, targetActor, targetUpdates) {
    // Item Piles has already authorized the transfer before this public hook.
    // Do not require targetActor.isOwner here: a player may transfer to a pile
    // whose actor is intentionally controlled by the GM.
    if (!sourceActor || !targetActor) return false;

    const deletedIds = new Set(normalizeUpdateIds(sourceUpdates?.itemsToDelete));
    const changedIds = new Set((sourceUpdates?.itemDeltas ?? [])
      .map((delta) => delta?.item?._id ?? delta?.item?.id)
      .filter(Boolean));
    const movedIds = new Set([...deletedIds, ...changedIds]);
    const sourceItems = Array.from(sourceActor?.items?.values?.() ?? sourceActor?.items ?? []);

    // Item Piles transfers quantities, while a container transfer must move its
    // complete hierarchy. Reject partial containers and stored children instead
    // of risking duplicated or orphaned contents.
    const movedStoredItems = sourceItems.filter((item) => movedIds.has(item.id) && ContainerService.isStored(item));
    if (movedStoredItems.length) return false;

    const roots = findTransferredContainerRoots(sourceActor, sourceUpdates);
    if (!roots.length) return true;

    if (roots.some((root) => !deletedIds.has(root.id))) return false;

    const affectedContainerIds = new Set(roots.map((root) => root.id));
    const changedRoots = new Set([...deletedIds, ...changedIds]
      .filter((id) => affectedContainerIds.has(id)));
    if (changedRoots.size !== roots.length) return false;

    const targetCreates = targetUpdates?.itemsToCreate;
    if (!Array.isArray(targetCreates) || !Array.isArray(sourceUpdates?.itemsToDelete)) return false;

    const replacements = [];
    for (const root of roots) {
      const targetRoot = targetCreates.find((data) => data?._id === root.id)
        ?? targetCreates.find((data) => data?.name === root.name && data?.type === root.type);
      if (!targetRoot) return false;
      replacements.push({ root, targetRoot });
    }

    for (const { root, targetRoot } of replacements) {
      const tree = collectContainerTree(sourceActor, root);
      const idMap = new Map([[root.id, targetRoot._id]]);
      const rootData = buildTransferredItemData(root, idMap, true, targetRoot._id);
      const groundTarget = pendingGroundTargets.get(targetActor?.uuid);
      if (groundTarget) {
        rootData.system.state = GROUND_CONTAINER_STATE;
        rootData.flags ??= {};
        rootData.flags[FLAG_SCOPE] ??= {};
        rootData.flags[FLAG_SCOPE][GROUND_CONTAINER_FLAG] = {
          ...groundTarget,
          actorId: targetActor.id,
          actorUuid: targetActor.uuid,
          containerId: targetRoot._id,
          previousState: rootPreviousState(root)
        };
      }
      Object.assign(targetRoot, rootData, { _id: targetRoot._id });

      for (const item of tree.slice(1)) {
        const existingIndex = targetCreates.findIndex((data) => data?._id === item.id);
        const existingId = existingIndex >= 0 ? targetCreates[existingIndex]._id : null;
        const data = buildTransferredItemData(item, idMap, false,
          existingId ?? uniqueItemId(targetActor, targetUpdates));
        idMap.set(item.id, data._id);
        if (existingIndex >= 0) targetCreates[existingIndex] = data;
        else targetCreates.push(data);
      }

      for (const item of tree) {
        if (ContainerService.isContainer(item)) ContainerService.allowDeleteWithTransferredContents(item);
      }
      for (const item of tree) {
        if (!sourceUpdates.itemsToDelete.includes(item.id)) sourceUpdates.itemsToDelete.push(item.id);
      }
    }

    return true;
  }

  static async dropToItemPile(canvas, data) {
    const api = getItemPilesApi();
    if (!api || typeof api.transferItems !== "function" || !canvas?.scene
      || !hasCanvasCoordinate(data?.x) || !hasCanvasCoordinate(data?.y)) {
      return { handled: false, success: false };
    }

    const actor = resolveActor(data);
    const container = actor?.items?.get?.(data.itemId);
    if (!actor || !container || !isTopLevelContainer(container) || !canTransferActors(actor, actor)) {
      return { handled: false, success: false };
    }

    const targetToken = findItemPileAt(canvas, Number(data.x), Number(data.y), api);
    if (targetToken && targetToken.actor?.uuid !== actor.uuid) {
      const result = await api.transferItems(actor, targetToken, [container.id]);
      return { handled: true, success: result !== false };
    }
    if (targetToken) return { handled: true, success: false };

    if (typeof api.createItemPile !== "function") {
      return { handled: false, success: false };
    }

    const created = await api.createItemPile({
      position: { x: Number(data.x), y: Number(data.y) },
      sceneId: canvas.scene.id,
      createActor: true,
      actorOverrides: { name: container.name },
      tokenOverrides: {
        name: container.name,
        texture: { src: container.img || "icons/svg/item-bag.svg" }
      },
      items: false
    });
    const pile = await resolveCreatedPile(created, canvas.scene, Number(data.x), Number(data.y), container.name, api);
    if (!pile?.token || !pile.actor) {
      await deleteCreatedPile(api, created, pile?.token);
      return { handled: true, success: false };
    }

    pendingGroundTargets.set(pile.actor.uuid, {
      version: GROUND_CONTAINER_VERSION,
      tokenId: pile.token.id,
      sceneId: canvas.scene.id,
      actorId: pile.actor.id,
      actorUuid: pile.actor.uuid
    });
    try {
      const result = await api.transferItems(actor, pile.actor, [container.id]);
      if (result === false) {
        await deleteCreatedPile(api, created, pile.token);
        return { handled: true, success: false };
      }
      return { handled: true, success: true };
    } finally {
      pendingGroundTargets.delete(pile.actor.uuid);
    }
  }
}

export function collectContainerTree(actor, rootContainer) {
  const items = Array.from(actor?.items?.values?.() ?? actor?.items ?? []);
  const tree = [];
  const visited = new Set();
  const walk = (item) => {
    if (!item?.id || visited.has(item.id)) throw new Error("Container hierarchy contains a cycle or duplicate item id");
    visited.add(item.id);
    tree.push(item);
    for (const child of items) {
      if (getStoredIn(child) === item.id) walk(child);
    }
  };
  walk(rootContainer);
  return tree;
}

function findTransferredContainerRoots(sourceActor, sourceUpdates) {
  const deleted = new Set(normalizeUpdateIds(sourceUpdates?.itemsToDelete));
  const changed = new Set((sourceUpdates?.itemDeltas ?? [])
    .map((delta) => delta?.item?._id ?? delta?.item?.id)
    .filter(Boolean));
  return Array.from(sourceActor?.items?.values?.() ?? sourceActor?.items ?? [])
    .filter((item) => ContainerService.isContainer(item) && !ContainerService.isStored(item))
    .filter((item) => deleted.has(item.id) || changed.has(item.id));
}

function normalizeUpdateIds(updates) {
  return (Array.isArray(updates) ? updates : [])
    .map((entry) => typeof entry === "string" ? entry : entry?._id ?? entry?.id)
    .filter(Boolean);
}

function buildTransferredItemData(item, idMap, isRoot, forcedId = null) {
  const data = clone(item.toObject?.() ?? item);
  data._id = forcedId ?? newItemId();
  data.flags ??= {};
  data.flags[FLAG_SCOPE] = clone(data.flags[FLAG_SCOPE] ?? {});
  if (isRoot) {
    delete data.flags[FLAG_SCOPE].storedIn;
    delete data.flags[FLAG_SCOPE].storedInName;
    delete data.flags[FLAG_SCOPE].preStoredState;
    delete data.flags[FLAG_SCOPE][GROUND_CONTAINER_FLAG];
    data.system ??= {};
    data.system.state = rootPreviousState(item);
  } else {
    const parentId = getStoredIn(item);
    data.flags[FLAG_SCOPE].storedIn = idMap.get(parentId);
    data.flags[FLAG_SCOPE].storedInName = item.parent?.items?.get?.(parentId)?.name ?? "";
  }
  return data;
}

function findItemPileAt(canvas, x, y, api) {
  return Array.from(canvas.tokens?.placeables ?? canvas.tokens ?? [])
    .map((token) => token?.document ?? token)
    .find((token) => {
      if (!api.isValidItemPile?.(token)) return false;
      const width = Number(token.width ?? 1) * Number(canvas.grid?.size ?? 100);
      const height = Number(token.height ?? 1) * Number(canvas.grid?.size ?? 100);
      return x >= Number(token.x) && x <= Number(token.x) + width
        && y >= Number(token.y) && y <= Number(token.y) + height;
    }) ?? null;
}

async function resolveCreatedPile(result, scene, x, y, name, api) {
  const uuids = typeof result === "string" ? [result] : [result?.tokenUuid, result?.actorUuid].filter(Boolean);
  let token = null;
  let actor = null;
  for (const uuid of uuids) {
    const document = await resolveUuid(uuid);
    if (document?.documentName === "Token") token = document;
    if (document?.documentName === "Actor") actor = document;
  }
  token ??= Array.from(scene.tokens ?? []).find((candidate) => {
    const dx = Math.abs(Number(candidate.x) - x);
    const dy = Math.abs(Number(candidate.y) - y);
    return dx < 1 && dy < 1 && (candidate.name === name || api.isValidItemPile?.(candidate));
  }) ?? null;
  actor ??= token?.actor ?? (uuids.length ? await resolveUuid(result?.actorUuid) : null);
  return { token, actor };
}

async function deleteCreatedPile(api, result, token) {
  const target = token ?? (typeof result === "string" ? await resolveUuid(result) : null);
  if (target && api.deleteItemPile) await api.deleteItemPile(target).catch(() => {});
}

function getItemPilesApi() {
  return globalThis.game?.itempiles?.API ?? null;
}

function getItemPilesPreTransferHook() {
  return globalThis.game?.itempiles?.CONSTANTS?.HOOKS?.ITEM?.PRE_TRANSFER ?? ITEM_PILES_PRE_TRANSFER_HOOK;
}

function canTransferActors(sourceActor, targetActor) {
  if (!globalThis.game?.user || globalThis.game.user.isGM) return true;
  return Boolean(sourceActor?.isOwner && targetActor?.isOwner);
}

function isTopLevelContainer(item) {
  return ContainerService.isContainer(item) && !ContainerService.isStored(item);
}

function getStoredIn(item) {
  return item?.getFlag?.(FLAG_SCOPE, "storedIn") ?? item?.flags?.[FLAG_SCOPE]?.storedIn ?? "";
}

function rootPreviousState(item) {
  return item?.getFlag?.(FLAG_SCOPE, GROUND_CONTAINER_FLAG)?.previousState
    ?? item?.flags?.[FLAG_SCOPE]?.[GROUND_CONTAINER_FLAG]?.previousState
    ?? item?.system?.state
    ?? "equipped";
}

function uniqueItemId(targetActor, targetUpdates) {
  const used = new Set([
    ...Array.from(targetActor?.items?.keys?.() ?? []),
    ...(targetUpdates?.itemsToCreate ?? []).map((item) => item?._id)
  ]);
  let id = newItemId();
  while (used.has(id)) id = newItemId();
  return id;
}

function newItemId() {
  return globalThis.foundry?.utils?.randomID?.() ?? globalThis.randomID?.()
    ?? globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 16);
}

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

async function resolveUuid(uuid) {
  if (!uuid) return null;
  if (typeof globalThis.fromUuid === "function") return globalThis.fromUuid(uuid);
  return globalThis.foundry?.utils?.fromUuid?.(uuid) ?? null;
}

async function deleteCreatedItems(actor, items) {
  const ids = items.map((item) => item.id).filter(Boolean).reverse();
  if (!ids.length) return;
  await actor.deleteEmbeddedDocuments("Item", ids, {
    render: false,
    [MODULE_ID]: { preserveContents: true }
  }).catch(() => {});
}

function rerenderActor(actor) {
  for (const app of Object.values(globalThis.ui?.windows ?? {})) {
    const document = app.actor ?? app.document;
    if (document?.uuid === actor?.uuid && typeof app.render === "function") app.render(false);
  }
}

function resolveActor(reference) {
  const actors = Array.from(globalThis.game?.actors ?? []);
  return actors.find((actor) => actor.uuid === reference?.actorUuid)
    ?? globalThis.game?.actors?.get?.(reference?.actorId)
    ?? null;
}

function hasCanvasCoordinate(value) {
  return typeof value === "number" ? Number.isFinite(value)
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
}

export const containerTransferConstants = Object.freeze({
  groundFlag: GROUND_CONTAINER_FLAG,
  groundState: GROUND_CONTAINER_STATE,
  groundVersion: GROUND_CONTAINER_VERSION,
  preTransferHook: ITEM_PILES_PRE_TRANSFER_HOOK
});
