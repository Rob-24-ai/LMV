"use client";
// Thin client for the AI route. Surfaces errors as thrown Errors with the
// server message so the UI can show "set your API key" etc.
import type { DatingResult, PriceResult, GeneratedListing } from "./types";

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

export const dateGarment = (images: string[]) =>
  call<DatingResult>({ action: "date", images });

export const priceItem = (facts: string, comps: string) =>
  call<PriceResult>({ action: "price", facts, comps });

export const writeListing = (facts: string) =>
  call<GeneratedListing>({ action: "write", facts });
