import { requestInStore } from "./request-in-store";
import { GALLERY_FREEZES } from "./state";
import type { GalleryFreeze } from "./types";

/** Read a saved portrait by identifier, returning undefined when it no longer exists. */
export async function getGalleryFreeze(id: string): Promise<GalleryFreeze | undefined> {
  return requestInStore(GALLERY_FREEZES, "readonly", (store) => store.get(id));
}
