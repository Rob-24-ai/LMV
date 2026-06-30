"use client";
// Thin client for the AI route. Surfaces errors as thrown Errors with the
// server message so the UI can show "set your API key" etc.
import type { AnalyzeResult, PriceResult, GeneratedListing, MeasureResult, Item, PhotoRole } from "./types";
import { getPhotoBlob } from "./store";
import { blobToDataUrl } from "./image";

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/generate-listing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data as T;
}

// Collect photo bytes as data URLs for vision calls. Pass `roles` to send only
// certain photo roles (e.g. just the measurement shots).
export async function collectPhotos(item: Item, roles?: PhotoRole[]): Promise<string[]> {
  const urls: string[] = [];
  for (const p of item.photos) {
    if (roles && !roles.includes(p.role)) continue;
    const blob = await getPhotoBlob(p.blobKey);
    if (blob) urls.push(await blobToDataUrl(blob));
  }
  return urls;
}

export const analyzeGarment = (images: string[]) =>
  call<AnalyzeResult>({ action: "analyze", images });

export const priceItem = (facts: string, comps: string) =>
  call<PriceResult>({ action: "price", facts, comps });

export const writeListing = (facts: string, images: string[]) =>
  call<GeneratedListing>({ action: "write", facts, images });

export const readMeasurements = (images: string[]) =>
  call<MeasureResult>({ action: "measure", images });
