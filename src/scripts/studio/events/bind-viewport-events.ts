import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { fitArtboard } from '../viewport/fit-artboard';
import { setZoom } from '../viewport/set-zoom';

/** Connect zoom controls and original-photo comparison. */
export function bindViewportEvents(): void {
  getElement('zoom-in').addEventListener('click', () => setZoom(model.zoom + 0.15));
  getElement('zoom-out').addEventListener('click', () => setZoom(model.zoom - 0.15));
  getElement('zoom-fit').addEventListener('click', fitArtboard);
  elements.zoomSlider.addEventListener('input', () =>
    setZoom(Number(elements.zoomSlider.value) / 100),
  );
  elements.comparePhoto.addEventListener('click', () => {
    model.showOriginal = !model.showOriginal;
    elements.originalPhoto.hidden = !model.showOriginal;
    elements.comparePhoto.classList.toggle('is-selected', model.showOriginal);
    elements.comparePhoto.textContent = model.showOriginal ? 'Showing photo' : 'Compare photo';
  });
}
