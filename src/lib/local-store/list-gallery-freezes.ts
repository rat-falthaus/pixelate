import { requestInStore } from "./request-in-store";
import { GALLERY_FREEZES } from "./state";
import type { GalleryFreeze } from "./types";

/** Read captured portraits in reverse chronological order. */
export async function listGalleryFreezes(): Promise<GalleryFreeze[]> {
  const freezes = await requestInStore(GALLERY_FREEZES, "readonly", (store) => store.getAll());
  return freezes.sort((left, right) => right.createdAt - left.createdAt);
}
