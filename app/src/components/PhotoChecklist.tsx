"use client";
import { useRef, useState } from "react";
import { PHOTO_SLOTS, type PhotoSlot } from "@/lib/config";
import { capturedIfShooting, type Item, type PhotoMeta } from "@/lib/types";
import { deletePhotoBlob } from "@/lib/store";
import { imageFilesFrom, filesToPhotos } from "@/lib/photos";
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
      <BulkDrop item={item} onChange={onChange} />
      {PHOTO_SLOTS.map((slot) => (
        <SlotRow key={slot.role} slot={slot} item={item} onChange={onChange} />
      ))}
    </div>
  );
}

// The fast path: drop a whole shoot at once. Everything lands in the "extra"
// pile — the generate call sends every photo regardless of slot — and the
// guided slots below stay as a checklist.
function BulkDrop({
  item,
  onChange,
}: {
  item: Item;
  onChange: (next: Item) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  async function ingest(files: FileList | null) {
    setNote(null);
    const list = imageFilesFrom(files);
    if (list.length === 0) {
      if (files && files.length > 0) setNote("Those weren't photos — try image files.");
      return;
    }
    setBusy(list.length);
    const { added, failed, reason } = await filesToPhotos(list, "extra", setBusy);
    setBusy(0);
    if (added.length > 0) {
      onChange({
        ...item,
        photos: [...item.photos, ...added],
        status: capturedIfShooting(item.status),
      });
    }
    setNote(
      failed > 0
        ? `Added ${added.length}, couldn't read ${failed}${reason ? ` — ${reason}` : ""}`
        : null,
    );
  }

  return (
    <div
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void ingest(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
        dragging ? "border-pumpkin bg-mustard/15" : "border-ink/30 bg-paper/60 hover:border-pumpkin"
      }`}
    >
      <p className="text-sm font-semibold text-ink">
        {busy > 0 ? `Adding ${busy}…` : "Drop the whole shoot here"}
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Drag a batch of photos or click to pick — HEIC from your phone works too.
      </p>
      {note && <p className="mt-2 text-xs font-semibold text-brick">{note}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
        multiple
        hidden
        onChange={(e) => {
          void ingest(e.target.files);
          e.target.value = "";
        }}
      />
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
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const photos = item.photos.filter((p) => p.role === slot.role);
  const filled = photos.length > 0;

  async function handleFiles(files: FileList | null) {
    setNote(null);
    const list = imageFilesFrom(files);
    // Single-shot slots take one file; multi slots take the batch.
    const chosen = slot.multi ? list : list.slice(0, 1);
    if (chosen.length === 0) return;
    const { added, failed, reason } = await filesToPhotos(chosen, slot.role);
    if (added.length > 0) {
      // Only replace the existing single-shot photo once the new one decoded,
      // so a failed retake never wipes a good shot.
      let photosNext = item.photos;
      if (!slot.multi) {
        for (const p of photos) await deletePhotoBlob(p.blobKey);
        photosNext = item.photos.filter((p) => p.role !== slot.role);
      }
      onChange({
        ...item,
        photos: [...photosNext, ...added],
        status: capturedIfShooting(item.status),
      });
    }
    if (failed > 0) {
      setNote(`Couldn't read ${failed} file${failed === 1 ? "" : "s"}${reason ? ` — ${reason}` : ""}`);
    }
  }

  async function remove(photo: PhotoMeta) {
    await deletePhotoBlob(photo.blobKey);
    onChange({ ...item, photos: item.photos.filter((p) => p.id !== photo.id) });
  }

  return (
    <div
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        // Ignore leave events bubbling up from children.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 p-3 transition-colors ${
        dragging ? "border-pumpkin bg-mustard/15" : "border-ink/80 bg-paper"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
              filled ? "bg-avocado text-paper" : "bg-cream text-ink-soft"
            }`}
          >
            {filled ? "✓" : ""}
          </span>
          <span className="text-sm font-semibold">
            {slot.label}
            {slot.required && <span className="text-brick"> *</span>}
          </span>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full border-2 border-ink/25 px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors hover:border-pumpkin hover:text-pumpkin"
        >
          {filled && !slot.multi ? "Retake" : "Add"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,.HEIC,.HEIF"
          capture="environment"
          multiple={slot.multi}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <p className="mb-2 text-xs text-ink-soft">{slot.hint}</p>
      {note && <p className="mb-2 text-xs font-semibold text-brick">{note}</p>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <button key={p.id} onClick={() => remove(p)} className="relative" title="Tap to remove">
              <Thumb blobKey={p.blobKey} className="h-16 w-16 rounded-xl border-2 border-ink/80" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brick text-[10px] text-paper">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
