import type { MessagePosition } from '../../../lib/types';
import { renderArtwork } from '../artwork/render-artwork';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { bindRange } from './bind-range';

/** Connect message content, placement, scale, and signature controls. */
export function bindMessageEvents(): void {
  elements.messageEnabled.addEventListener('change', () => {
    model.messageEnabled = elements.messageEnabled.checked;
    elements.messageControls.classList.toggle('is-disabled', !model.messageEnabled);
    renderArtwork();
  });
  elements.messageText.addEventListener('input', () => {
    model.message = elements.messageText.value;
    model.messageOrigin = null;
    renderArtwork();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.addEventListener('click', () => {
      model.messagePosition = button.dataset.position as MessagePosition;
      model.messageOrigin = null;
      document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((candidate) => {
        candidate.classList.toggle('is-selected', candidate === button);
      });
      renderArtwork();
    });
  });
  bindRange(elements.messageScale, elements.messageScaleValue, (value) => {
    model.messageScale = value;
    renderArtwork();
  });
  elements.showBadge.addEventListener('change', () => {
    model.showBadge = elements.showBadge.checked;
    renderArtwork();
  });
}
