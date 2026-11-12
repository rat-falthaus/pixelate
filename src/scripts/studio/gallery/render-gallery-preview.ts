import type { GalleryFreeze } from '../../../lib/local-store';
import { readBlobAsDataUrl } from '../branding/read-blob-as-data-url';
import { elements } from '../dom/elements';
import { revokeActiveImageUrl } from '../photo/revoke-active-image-url';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { updateLiveUi } from '../ui/update-live-ui';
import { fitArtboard } from '../viewport/fit-artboard';

/** Present a saved PNG unchanged; return false if a newer source/deletion cancels its pending load. */
export async function renderGalleryPreview(
  freeze: GalleryFreeze,
  image: HTMLImageElement,
  url: string,
  request: number,
): Promise<boolean> {
  const dataUrl = await readBlobAsDataUrl(freeze.blob);
  if (request !== runtime.galleryPreviewRequest) return false;
  if (model.liveCameraActive) {
    window.clearTimeout(runtime.freezePreviewTimer);
    model.freezePreview = true;
  }
  revokeActiveImageUrl();
  runtime.activeImageUrl = url;
  runtime.previewFreeze = freeze;
  model.image = image;
  model.fileName = 'saved-portrait';
  model.showOriginal = false;
  model.gridCols = image.naturalWidth / model.tileSize;
  model.gridRows = image.naturalHeight / model.tileSize;
  model.currentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${image.naturalWidth}" height="${image.naturalHeight}" viewBox="0 0 ${image.naturalWidth} ${image.naturalHeight}"><image width="100%" height="100%" href="${dataUrl}"/></svg>`;
  elements.svgOutput.innerHTML = model.currentSvg;
  elements.svgOutput.style.width = `${image.naturalWidth}px`;
  elements.svgOutput.style.height = `${image.naturalHeight}px`;
  elements.artboard.style.width = `${image.naturalWidth}px`;
  elements.artboard.style.height = `${image.naturalHeight}px`;
  elements.originalPhoto.src = url;
  elements.originalPhoto.hidden = true;
  elements.comparePhoto.disabled = true;
  elements.comparePhoto.textContent = 'Saved portrait';
  document.querySelector('.artwork-stats')?.classList.add('is-hidden');
  elements.sourceThumb.src = url;
  elements.fileName.textContent = 'Saved portrait (unchanged)';
  elements.sourceDimensions.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
  updateLiveUi();
  requestAnimationFrame(fitArtboard);
  return true;
}
