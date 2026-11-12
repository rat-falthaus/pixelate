import type { BackgroundMode } from '../../../lib/types';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { renderArtwork } from './render-artwork';

/** Apply the preview background and regenerate the exported SVG. */
export function setBackground(background: BackgroundMode): void {
  model.background = background;
  document.querySelectorAll<HTMLButtonElement>('[data-background]').forEach((button) => {
    const selected = button.dataset.background === background;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  elements.artboard.classList.remove('artboard-dark', 'artboard-light', 'artboard-transparent');
  const artboardClass =
    background === 'black'
      ? 'artboard-dark'
      : background === 'white'
        ? 'artboard-light'
        : 'artboard-transparent';
  elements.artboard.classList.add(artboardClass);
  renderArtwork();
}
