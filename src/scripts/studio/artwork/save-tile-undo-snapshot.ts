import { model } from "../state/model";
import { renderUndoControls } from "../ui/render-undo-controls";

/** Snapshot tile overrides before editing, retaining at most thirty undo steps. */
export function saveTileUndoSnapshot(): void {
  model.tileUndoStack.push(new Map(model.manualTileOverrides));
  if (model.tileUndoStack.length > 30) model.tileUndoStack.shift();
  renderUndoControls();
}
