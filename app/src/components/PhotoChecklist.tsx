"use client";
import { useRef } from "react";
import { PHOTO_SLOTS, type PhotoSlot } from "@/lib/config";
import type { Item, PhotoMeta } from "@/lib/types";
import { putPhotoBlob, deletePhotoBlob, makeId } from "@/lib/store";
import { displayImage, hiResImage } from "@/lib/image";
import { Thumb } from "./Thumb";

export function PhotoChecklist({
  item,
  onChange,
}: {
  item: Item;
  onChange: (next: Item) => void;
}) {
  return (
    <div className="space-y-4">
      {PHOTO_SLOTS.map((slot) => (
        <SlotRow key={slot.role} slot={slot} item={item} onChange={onChange} />
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  item,
  onChange,
}: {
  slot: PhotoSlot;
  item: Item;
  onChange: (next: Item) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = item.photos.filter((p) => p.role === slot.role);
  const filled = photos.length > 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: PhotoMeta[] = [];
    for (const file of Array.from(files)) {
      const blob = slot.hiRes ? await hiResImage(file) : await displayImage(file);
      const blobKey = makeId("blob");
      await putPhotoBlob(blobKey, blob);
      added.push({
        id: makeId("ph"),
        role: slot.role,
        createdAt: Date.now(),
        blobKey,
        hiRes: slot.hiRes,
      });
      if (!slot.multi) break;
    }
    // Single-shot slots replace; multi slots append.
    let photosNext = item.photos;
    if (!slot.multi) {
      for (const p of photos) await deletePhotoBlob(p.blobKey);
      photosNext = item.photos.filter((p) => p.role !== slot.role);
    }
    onChange({ ...item, photos: [...photosNext, ...added] });
  }

  async function remove(photo: PhotoMeta) {
    await deletePhotoBlob(photo.blobKey);
    onChange({ ...item, photos: item.photos.filter((p) => p.id !== photo.id) });
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
              filled ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {filled ? "✓" : ""}
          </span>
          <span className="text-sm font-medium">
            {slot.label}
            {slot.required && <span className="text-red-500"> *</span>}
            {slot.hiRes && (
              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">hi-res</span>
            )}
          </span>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
        >
          {filled && !slot.multi ? "Retake" : "Add"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={slot.multi}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <p className="mb-2 text-xs text-neutral-400">{slot.hint}</p>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <button key={p.id} onClick={() => remove(p)} className="relative" title="Tap to remove">
              <Thumb blobKey={p.blobKey} className="h-16 w-16 rounded-lg" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[10px] text-white">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
