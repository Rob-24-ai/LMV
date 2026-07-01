"use client";
import { useEffect, useState } from "react";
import { getPhotoBlob } from "@/lib/store";

// Resolves an IndexedDB blob key to an object URL and revokes it on unmount.
export function Thumb({ blobKey, className }: { blobKey: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let made: string | null = null;
    getPhotoBlob(blobKey).then((blob) => {
      if (!active || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      active = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [blobKey]);

  if (!url) return <div className={`bg-cream ${className ?? ""}`} />;
  // draggable={false}: the img sits inside a drop-target card; a draggable
  // image would start its own drag and eat the file-drop hit test.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" draggable={false} className={`object-cover ${className ?? ""}`} />;
}
