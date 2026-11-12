import type { ImageSource } from '../../../lib/types';
import { rebuildArtwork } from '../artwork/rebuild-artwork';
import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { renderUndoControls } from '../ui/render-undo-controls';
import { updateLiveUi } from '../ui/update-live-ui';
import { revokeActiveImageUrl } from './revoke-active-image-url';

/** Install a decoded source image, reset image-specific edits, and rebuild its preview. */
export function setImageSource(image: ImageSource, fileName: string, previewUrl?: string): void {
  revokeActiveImageUrl();
  runtime.activeImageUrl = previewUrl?.startsWith('blob:') ? previewUrl : null;
  model.image = image;
  model.fileName = fileName.replace(/\.[^.]+$/, '') || 'pixel-artwork';
  model.manualSubjectMask.clear();
  model.manualTileOverrides.clear();
  model.tileUndoStack = [];
  model.messageOrigin = null;
  model.showOriginal = false;
  const width = image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const height =
    image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;
  const preview =
    previewUrl ?? (image instanceof HTMLCanvasElement ? image.toDataURL('image/png') : image.src);
  elements.fileName.textContent = fileName;
  elements.sourceDimensions.textContent = `${width} × ${height}`;
  elements.sourceThumb.src = preview;
  elements.originalPhoto.src = preview;
  elements.originalPhoto.hidden = true;
  elements.comparePhoto.textContent = 'Compare photo';
  getElement('reset-mask').classList.add('is-hidden');
  renderUndoControls();
  updateLiveUi();
  rebuildArtwork(true);
}
