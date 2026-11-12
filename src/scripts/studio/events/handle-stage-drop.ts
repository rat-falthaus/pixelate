import { getGalleryFreeze } from "../../../lib/local-store";
import { previewGalleryFreeze } from "../gallery/preview-gallery-freeze";
import { notify } from "../ui/notify";

/** Resolve a dropped gallery identifier and preview the stored portrait. */
export function handleStageDrop(event: DragEvent): void {
  const freezeId = (event as DragEvent).dataTransfer?.getData("text/plain");
  if (!freezeId) return;
  event.preventDefault();
  void getGalleryFreeze(freezeId)
    .then((freeze) => {
      if (!freeze) throw new Error("That saved portrait is no longer available.");
      return previewGalleryFreeze(freeze);
    })
    .catch((error: unknown) =>
      notify(error instanceof Error ? error.message : "Could not preview the saved portrait."),
    );
}
