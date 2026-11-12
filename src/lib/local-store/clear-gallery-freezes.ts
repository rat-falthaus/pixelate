import { requestInStore } from "./request-in-store";
import { GALLERY_FREEZES } from "./state";

/** Remove all gallery portrait records without changing stored brand assets. */
export async function clearGalleryFreezes(): Promise<void> {
  await requestInStore(GALLERY_FREEZES, "readwrite", (store) => store.clear());
}
