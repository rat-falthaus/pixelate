import { elements } from '../dom/elements';
import { model } from '../state/model';

/** Apply pan and zoom state to the artboard and synchronize zoom controls. */
export function updateViewportTransform(): void {
  elements.transform.style.transform = `translate(${model.panX}px, ${model.panY}px) scale(${model.zoom})`;
  elements.zoomValue.textContent = `${Math.round(model.zoom * 100)}%`;
  elements.zoomSlider.value = String(Math.min(400, Math.max(15, Math.round(model.zoom * 100))));
}
