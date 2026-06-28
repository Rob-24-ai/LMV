// Local-first persistence via IndexedDB (idb-keyval). No backend, no auth —
// correct for a single operator. Photos (blobs) and item metadata both live
// here. A Supabase sync layer can slot in behind this interface later.
"use client";

import { get, set, del, keys } from "idb-keyval";
import type { Item } from "./types";

const ITEM_PREFIX = "item:";
const PHOTO_PREFIX = "photo:";

let idCounter = 0;
// Monotonic-ish id without Date.now()/random reliance in hot loops.
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export async function listItems(): Promise<Item[]> {
  const allKeys = (await keys()) as string[];
  const itemKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(ITEM_PREFIX));
  const items = await Promise.all(itemKeys.map((k) => get<Item>(k)));
  return items
    .filter((i): i is Item => Boolean(i))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getItem(id: string): Promise<Item | undefined> {
  return get<Item>(ITEM_PREFIX + id);
}

export async function saveItem(item: Item): Promise<void> {
  item.updatedAt = Date.now();
  await set(ITEM_PREFIX + item.id, item);
}

export async function deleteItem(item: Item): Promise<void> {
  await Promise.all(item.photos.map((p) => del(PHOTO_PREFIX + p.blobKey)));
  await del(ITEM_PREFIX + item.id);
}

export async function putPhotoBlob(blobKey: string, blob: Blob): Promise<void> {
  await set(PHOTO_PREFIX + blobKey, blob);
}

export async function getPhotoBlob(blobKey: string): Promise<Blob | undefined> {
  return get<Blob>(PHOTO_PREFIX + blobKey);
}

export async function deletePhotoBlob(blobKey: string): Promise<void> {
  await del(PHOTO_PREFIX + blobKey);
}
