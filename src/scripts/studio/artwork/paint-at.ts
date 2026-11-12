import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { rebuildArtwork } from './rebuild-artwork';
import { renderArtwork } from './render-artwork';

/** Translate screen coordinates into a grid cell and apply the active paint or mask brush. */
export function paintAt(clientX: number, clientY: number): void {
  const rect = elements.artboard.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const col = Math.floor(((clientX - rect.left) / rect.width) * model.gridCols);
  const row = Math.floor(((clientY - rect.top) / rect.height) * model.gridRows);
  if (col < 0 || col >= model.gridCols || row < 0 || row >= model.gridRows) return;
  const key = `${col},${row}`;

  if (model.tool === 'subject') {
    const keep = model.maskBrush === 'keep';
    if (model.manualSubjectMask.get(key) === keep) return;
    model.manualSubjectMask.set(key, keep);
    runtime.pendingSubjectEdit = true;
    if (!runtime.processFrame) {
      runtime.processFrame = requestAnimationFrame(() => {
        runtime.processFrame = 0;
        if (runtime.pendingSubjectEdit) {
          runtime.pendingSubjectEdit = false;
          rebuildArtwork();
        }
      });
    }
    getElement('reset-mask').classList.remove('is-hidden');
    return;
  }

  if (model.manualTileOverrides.get(key) === model.selectedBrush) return;
  model.manualTileOverrides.set(key, model.selectedBrush);
  renderArtwork();
}
