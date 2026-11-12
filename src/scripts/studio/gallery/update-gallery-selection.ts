import { getElement } from '../dom/get-element';
import { runtime } from '../state/runtime';

/** Synchronize the selected-portrait count and gallery share action. */
export function updateGallerySelection(): void {
  const count = runtime.selectedGalleryIds.size;
  getElement('gallery-selection-count').textContent = `${count} selected`;
  (getElement('gallery-share') as HTMLButtonElement).disabled = count === 0;
}
