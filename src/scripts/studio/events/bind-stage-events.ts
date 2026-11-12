import { elements } from '../dom/elements';
import { endStagePointer } from './end-stage-pointer';
import { handleStageDrop } from './handle-stage-drop';
import { handleStagePointerDown } from './handle-stage-pointer-down';
import { handleStagePointerMove } from './handle-stage-pointer-move';
import { handleStageWheel } from './handle-stage-wheel';

/** Connect stage pointer gestures, gallery drops, and wheel zoom. */
export function bindStageEvents(): void {
  elements.stage.addEventListener('pointerdown', handleStagePointerDown);
  elements.stage.addEventListener('pointermove', handleStagePointerMove);

  elements.stage.addEventListener('pointerup', endStagePointer);
  elements.stage.addEventListener('pointercancel', endStagePointer);
  elements.stage.addEventListener('dragover', (event) => event.preventDefault());
  elements.stage.addEventListener('drop', handleStageDrop);
  elements.stage.addEventListener('wheel', handleStageWheel, { passive: false });
}
