"use client";
import { useEffect } from "react";

// Without this, dropping a photo a hair outside a drop zone makes the browser
// navigate to file:///…/IMG.HEIC and blows away the app. This cancels the
// browser's default for file drags anywhere on the window. It does NOT stop the
// real drop zones: preventDefault suppresses the default action but not
// propagation, so each zone's own onDrop still fires.
export function DropGuard() {
  useEffect(() => {
    const isFileDrag = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const guard = (e: DragEvent) => {
      if (isFileDrag(e)) e.preventDefault();
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);
  return null;
}
