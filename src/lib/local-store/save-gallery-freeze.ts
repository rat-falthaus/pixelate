import { createId } from "./create-id";
import { requestInStore } from "./request-in-store";
import { GALLERY_FREEZES } from "./state";
import type { GalleryFreeze } from "./types";

/** Persist a captured PNG with a new identifier and capture timestamp. */
export async function saveGalleryFreeze(blob: Blob): Promise<GalleryFreeze> {
  const freeze: GalleryFreeze = { id: createId(), createdAt: Date.now(), blob };
  await requestInStore(GALLERY_FREEZES, "readwrite", (store) => store.put(freeze));
  return freeze;
}
