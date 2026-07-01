// Shared photo intake: used by the item page's bulk drop zone, the per-slot
// pickers, and dropping straight onto a card in the pipeline. The generate call
// sends every photo regardless of slot, so bulk drops default to the "extra" role.
"use client";

import type { PhotoMeta, PhotoRole } from "./types";
import { putPhotoBlob, makeId } from "./store";
import { displayImage } from "./image";

// Drag-and-drop and file pickers both hand us a mix; keep only images. HEIC
// from Finder often reports an empty MIME type, so also match the extension.
export function imageFilesFrom(files: FileList | null): File[] {
  return Array.from(files ?? []).filter(
    (f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name),
  );
}

// Pull a readable message out of anything thrown. Decoders (heic2any) can reject
// with a plain { code, message } object, not an Error — String()-ing that gives
// the useless "[object Object]", so handle the object shape explicitly.
function errMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (e && typeof e === "object") {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
    try { return JSON.stringify(e); } catch { /* fall through */ }
  }
  return String(e);
}

// Compress + store each file, returning the new photos plus a count of files we
// couldn't read and the first failure reason. Failures are logged and surfaced,
// not swallowed — a silent skip is how the feature looked like it "did nothing"
// when a file failed to decode. onProgress fires after each file so a big shoot
// shows a live count instead of a frozen "Adding N…".
export async function filesToPhotos(
  files: File[],
  role: PhotoRole,
  onProgress?: (remaining: number) => void,
): Promise<{ added: PhotoMeta[]; failed: number; reason: string | null }> {
  const added: PhotoMeta[] = [];
  let failed = 0;
  let reason: string | null = null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const blob = await displayImage(file);
      const blobKey = makeId("blob");
      await putPhotoBlob(blobKey, blob);
      added.push({ id: makeId("ph"), role, createdAt: Date.now(), blobKey });
    } catch (e) {
      failed++;
      if (!reason) reason = `${file.name} — ${errMessage(e)}`;
      console.error("photo intake failed:", file.name, e);
    }
    onProgress?.(files.length - (i + 1));
    // Yield so the tab can paint and the count can update between files.
    await new Promise((r) => setTimeout(r));
  }
  return { added, failed, reason };
}
