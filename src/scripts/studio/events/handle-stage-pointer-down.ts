import { paintAt } from '../artwork/paint-at';
import { saveTileUndoSnapshot } from '../artwork/save-tile-undo-snapshot';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { runtime } from '../state/runtime';

/** Start artwork dragging or painting without intercepting interactive controls. */
export function handleStagePointerDown(event: PointerEvent): void {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  const target = event.target;
  if (
    target instanceof Element &&
    target.closest('button, a, input, select, textarea, [role="button"]')
  )
    return;
  const messageTarget = target instanceof Element && target.closest('[data-draggable="message"]');
  const logoTarget = target instanceof Element && target.closest('[data-draggable="logo"]');
  if (
    messageTarget &&
    model.messageEnabled &&
    !model.config.messagePositionLocked &&
    model.tool === 'pan'
  ) {
    const rect = elements.artboard.getBoundingClientRect();
    const pointerCol = Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols);
    const pointerRow = Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows);
    const box = messageTarget.getBoundingClientRect();
    const origin = model.messageOrigin ?? {
      col: Math.floor(((box.left - rect.left) / rect.width) * model.gridCols),
      row: Math.floor(((box.top - rect.top) / rect.height) * model.gridRows),
    };
    runtime.messageDragOffset = { col: pointerCol - origin.col, row: pointerRow - origin.row };
    elements.stage.setPointerCapture(event.pointerId);
    elements.stage.dataset.draggingMessage = 'true';
    return;
  }
  if (logoTarget && !model.config.logoPositionLocked && model.tool === 'pan') {
    const rect = elements.artboard.getBoundingClientRect();
    const pointerCol = Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols);
    const pointerRow = Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows);
    const box = logoTarget.getBoundingClientRect();
    const origin = model.logoOrigin ?? {
      col: Math.floor(((box.left - rect.left) / rect.width) * model.gridCols),
      row: Math.floor(((box.top - rect.top) / rect.height) * model.gridRows),
    };
    runtime.logoDragOffset = { col: pointerCol - origin.col, row: pointerRow - origin.row };
    elements.stage.setPointerCapture(event.pointerId);
    elements.stage.dataset.draggingLogo = 'true';
    return;
  }
  elements.stage.setPointerCapture(event.pointerId);
  if (model.tool === 'recolor' || model.tool === 'subject') {
    if (model.tool === 'recolor') saveTileUndoSnapshot();
    runtime.painting = true;
    paintAt(event.clientX, event.clientY);
  } else {
    runtime.pointerStart = {
      x: event.clientX,
      y: event.clientY,
      panX: model.panX,
      panY: model.panY,
    };
  }
}
