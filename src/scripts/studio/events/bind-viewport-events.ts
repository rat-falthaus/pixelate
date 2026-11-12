import { elements } from '../dom/elements';
import { model } from '../state/model';

/** Connect original-photo comparison without allowing user zoom or image panning. */
export function bindViewportEvents(): void {
  elements.comparePhoto.addEventListener('click', () => {
    model.showOriginal = !model.showOriginal;
    elements.originalPhoto.hidden = !model.showOriginal;
    elements.comparePhoto.classList.toggle('is-selected', model.showOriginal);
    elements.comparePhoto.textContent = model.showOriginal ? 'Showing photo' : 'Compare photo';
  });
}
