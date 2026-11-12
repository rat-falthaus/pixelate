import type { ArtworkSnapshot } from "../../../lib/types";
import { elements } from "../dom/elements";
import { model } from "../state/model";
import { runtime } from "../state/runtime";

/** Snapshot exports before awaiting browser APIs, so live frames cannot change the chosen portrait. */
export function getExportSnapshot(fromShareDialog = false): ArtworkSnapshot {
  if (fromShareDialog && elements.shareDialog.open && runtime.shareSnapshot)
    return runtime.shareSnapshot;
  if (!model.image || !model.currentSvg)
    throw new Error("Take a photo or choose one before exporting.");
  return {
    svg: model.currentSvg,
    width: elements.artboard.offsetWidth,
    height: elements.artboard.offsetHeight,
    fileName: model.fileName,
    pngBlob: runtime.previewFreeze?.blob ?? null,
    galleryFreezeId: runtime.previewFreeze?.id ?? null,
  };
}
