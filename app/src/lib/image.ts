// Client-side image handling. Photos get compressed to a single display size —
// small enough for snappy IndexedDB storage, big enough for the dating vision
// call to read RN numbers, union labels, and zipper detail.
"use client";

// We never trust the file extension or MIME to pick a decoder. Some cameras
// (e.g. the "zerocam" export) write a plain JPEG under a .heif name, and Finder
// hands most dropped files an empty MIME type. The extension lies in both
// directions (.heic files that are really JPEG, .heif files that are real HEIC),
// so routing is decided by the actual magic bytes.
type ImgFormat = "jpeg" | "png" | "webp" | "avif" | "heif" | "gif" | "unknown";

async function sniffFormat(file: Blob): Promise<ImgFormat> {
  const buf = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (buf.length < 12) return "unknown";
  // JPEG: FF D8 FF  (covers ffd8ffe0/e1/e2/ee — EXIF, JFIF, Adobe/CMYK)
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  // RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  // ISO-BMFF: "ftyp" at bytes 4..8, brand + compatible-brands follow at 8..
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brands = String.fromCharCode(...buf.slice(8, 32));
    // AVIF checked first: Chromium decodes it natively and heic2any cannot.
    if (/avif|avis/.test(brands)) return "avif";
    if (/heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1|heif/.test(brands)) return "heif";
    return "unknown"; // some other ftyp box (mp4, etc.) — let native try
  }
  return "unknown";
}

// heic2any@0.0.4 rejects with a raw string ("ERR_LIBHEIF …" / "ERR_USER …"), a
// plain { code, message } object, OR an Error — never guaranteed to be an Error.
// That non-Error object is exactly what surfaced as "[object Object]". Normalize
// every shape into a real Error so callers get a readable message.
function normalizeHeicError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "string") return new Error(e);
  if (e && typeof e === "object") {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return new Error(msg);
    try { return new Error(JSON.stringify(e)); } catch { /* fall through */ }
  }
  return new Error(String(e));
}

// Decode HEIC/HEIF to a JPEG blob the canvas can read. heic2any pulls a wasm
// codec, so it's dynamically imported — the cost only lands on a genuine HEIF.
async function heicToJpeg(file: Blob): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  try {
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return Array.isArray(out) ? out[0] : (out as Blob);
  } catch (e) {
    throw normalizeHeicError(e);
  }
}

async function fileToBitmap(file: Blob): Promise<ImageBitmap> {
  // createImageBitmap honors EXIF orientation in modern browsers.
  return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
}

// Route a source file to an upright bitmap. The sniff picks the primary decoder;
// the opposite decoder is a fallback, so a mislabeled file self-corrects instead
// of failing. Genuine HEVC-HEIF goes to heic2any first; everything else (real
// JPEG-named-.heif, AVIF, normal images, unknown ftyp) tries native first.
async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  const fmt = await sniffFormat(file);
  if (fmt === "heif") {
    try {
      return await fileToBitmap(await heicToJpeg(file));
    } catch (primaryErr) {
      try {
        return await fileToBitmap(file); // Safari / future Chromium may decode HEIC natively
      } catch {
        throw normalizeHeicError(primaryErr); // surface the meaningful heic2any error
      }
    }
  }
  try {
    return await fileToBitmap(file);
  } catch (nativeErr) {
    try {
      return await fileToBitmap(await heicToJpeg(file));
    } catch {
      throw nativeErr instanceof Error ? nativeErr : new Error(String(nativeErr));
    }
  }
}

export async function compressImage(
  file: File,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await decodeToBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      "image/jpeg",
      quality,
    );
  });
}

// Every photo: 1600px is plenty for dating and keeps storage light.
export const displayImage = (file: File) => compressImage(file, 1600, 0.82);

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
