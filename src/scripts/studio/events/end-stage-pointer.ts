import { elements } from '../dom/elements';
import { runtime } from '../state/runtime';

/** End a stage gesture and clear transient drag and paint state. */
export function endStagePointer(): void {
  runtime.pointerStart = null;
  runtime.painting = false;
  delete elements.stage.dataset.draggingMessage;
  delete elements.stage.dataset.draggingLogo;
}
