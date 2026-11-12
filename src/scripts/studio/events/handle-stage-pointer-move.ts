import { paintAt } from "../artwork/paint-at";
import { renderArtwork } from "../artwork/render-artwork";
import { elements } from "../dom/elements";
import { model } from "../state/model";
import { runtime } from "../state/runtime";

/** Continue grid-snapped overlay dragging or touch/mouse painting, never image panning. */
export function handleStagePointerMove(event: PointerEvent): void {
  if (elements.stage.dataset.draggingMessage === "true") {
    const rect = elements.artboard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    model.messageOrigin = {
      col:
        Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols) -
        runtime.messageDragOffset.col,
      row:
        Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows) -
        runtime.messageDragOffset.row,
    };
    renderArtwork();
    return;
  }
  if (elements.stage.dataset.draggingLogo === "true") {
    const rect = elements.artboard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    model.logoOrigin = {
      col:
        Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols) -
        runtime.logoDragOffset.col,
      row:
        Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows) -
        runtime.logoDragOffset.row,
    };
    renderArtwork();
    return;
  }
  if (runtime.painting) {
    paintAt(event.clientX, event.clientY);
    return;
  }
}
