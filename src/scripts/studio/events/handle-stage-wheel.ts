import { model } from '../state/model';
import { setZoom } from '../viewport/set-zoom';

/** Translate wheel movement into a bounded artwork zoom change. */
export function handleStageWheel(event: WheelEvent): void {
  event.preventDefault();
  setZoom(model.zoom + (event.deltaY < 0 ? 0.12 : -0.12));
}
