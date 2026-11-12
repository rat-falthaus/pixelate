import type { ToolMode } from '../../../lib/types';
import { renderArtwork } from '../artwork/render-artwork';
import { saveTileUndoSnapshot } from '../artwork/save-tile-undo-snapshot';
import { setTool } from '../artwork/set-tool';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { notify } from '../ui/notify';
import { renderUndoControls } from '../ui/render-undo-controls';

/** Connect canvas tools, mask modes, and tile undo and clear actions. */
export function bindBrushEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool as ToolMode));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-mask]').forEach((button) => {
    button.addEventListener('click', () => {
      model.maskBrush = button.dataset.mask === 'keep' ? 'keep' : 'background';
      document.querySelectorAll<HTMLButtonElement>('[data-mask]').forEach((candidate) => {
        candidate.classList.toggle('is-selected', candidate === button);
      });
    });
  });
  elements.undoTiles.addEventListener('click', () => {
    const previous = model.tileUndoStack.pop();
    if (!previous) return;
    model.manualTileOverrides = previous;
    renderUndoControls();
    renderArtwork();
  });
  elements.clearTiles.addEventListener('click', () => {
    if (!model.manualTileOverrides.size) return;
    saveTileUndoSnapshot();
    model.manualTileOverrides.clear();
    renderArtwork();
    notify('Manual tile edits cleared.');
  });
}
