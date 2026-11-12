import { deleteGalleryFreeze } from "../../../lib/local-store";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";
import { clearDeletedPreview } from "./clear-deleted-preview";
import { refreshGallery } from "./refresh-gallery";

/** Delete only requested portraits, release active previews, and reconcile partial storage failures. */
export async function removeGalleryFreezes(ids: string[]): Promise<void> {
  try {
    for (const id of ids) {
      if (runtime.pendingGalleryPreviewId === id) {
        runtime.galleryPreviewRequest += 1;
        runtime.pendingGalleryPreviewId = null;
      }
      await deleteGalleryFreeze(id);
      runtime.selectedGalleryIds.delete(id);
      clearDeletedPreview(id);
    }
    notify(
      ids.length === 1
        ? "Portrait removed from this device."
        : "Selected portraits removed from this device.",
    );
  } catch (error) {
    console.error("Gallery portraits could not be removed.", error);
    notify(
      error instanceof Error ? error.message : "Portraits could not be removed from local storage.",
    );
  } finally {
    try {
      await refreshGallery();
    } catch (error) {
      console.error("The gallery could not be refreshed after deletion.", error);
      notify("Gallery could not be refreshed. Reopen it to try again.");
    }
  }
}
