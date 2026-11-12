import { elements } from '../dom/elements';
import { model } from '../state/model';

/** Update undo and clear actions to reflect the available tile edits. */
export function renderUndoControls(): void {
  elements.undoTiles.disabled = model.tileUndoStack.length === 0;
  elements.clearTiles.classList.toggle('is-hidden', model.manualTileOverrides.size === 0);
}
