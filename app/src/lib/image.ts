// Client-side image handling. Display photos get compressed for snappy storage;
// tag shots (hiRes) are kept large so the dating vision call can read RN
// numbers, union labels, and zipper detail. One global compression level would
// silently wreck dating accuracy — so this takes a maxDim per call.
"use client";

async function fileToBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap honors EXIF orientation in modern browsers.
  return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
}

export async function compressImage(
  file: File,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
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

// Display photos: 1600px is plenty and keeps storage light.
export const displayImage = (file: File) => compressImage(file, 1600, 0.82);
// Tag shots: keep detail for the dating call.
export const hiResImage = (file: File) => compressImage(file, 2600, 0.92);

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
