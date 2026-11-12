import { elements } from '../dom/elements';
import { model } from '../state/model';
import { rebuildArtwork } from './rebuild-artwork';

/** Clamp tile size, synchronize size controls, and resample the current image. */
export function syncTileSize(value: string): void {
  const next = Math.max(4, Math.min(80, Number.parseInt(value, 10) || 18));
  model.tileSize = next;
  elements.tileSize.value = String(next);
  elements.tileSizeNumber.value = String(next);
  document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.size) === next);
  });
  rebuildArtwork();
}
