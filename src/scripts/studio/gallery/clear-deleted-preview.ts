import { returnToLive } from "../camera/return-to-live";
import { elements } from "../dom/elements";
import { revokeActiveImageUrl } from "../photo/revoke-active-image-url";
import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { updateLiveUi } from "../ui/update-live-ui";

/** Release a deleted portrait's active image references, or restore its still-running camera. */
export function clearDeletedPreview(id: string): void {
  if (runtime.previewFreeze?.id !== id) return;
  if (model.liveCameraActive && runtime.liveFrameCanvas) {
    returnToLive();
    return;
  }
  revokeActiveImageUrl();
  runtime.previewFreeze = null;
  model.image = null;
  model.currentSvg = "";
  model.cells = [];
  model.clusters = [];
  model.gridCols = 0;
  model.gridRows = 0;
  elements.svgOutput.replaceChildren();
  elements.originalPhoto.removeAttribute("src");
  elements.originalPhoto.hidden = true;
  elements.sourceThumb.removeAttribute("src");
  elements.fileName.textContent = "Choose a photo";
  elements.sourceDimensions.textContent = "No image selected";
  updateLiveUi();
}
