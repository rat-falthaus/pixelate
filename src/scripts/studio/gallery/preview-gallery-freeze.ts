import type { GalleryFreeze } from '../../../lib/local-store';
import { getElement } from '../dom/get-element';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { updateLiveUi } from '../ui/update-live-ui';
import { renderGalleryPreview } from './render-gallery-preview';

/** Decode a stored portrait for stage preview while retaining ownership of its object URL. */
export async function previewGalleryFreeze(freeze: GalleryFreeze): Promise<void> {
  const request = ++runtime.galleryPreviewRequest;
  runtime.pendingGalleryPreviewId = freeze.id;
  const url = URL.createObjectURL(freeze.blob);
  const image = new Image();
  let retainedUrl = false;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This saved portrait could not be opened.'));
      image.src = url;
    });
    if (request !== runtime.galleryPreviewRequest) return;
    retainedUrl = await renderGalleryPreview(freeze, image, url, request);
    if (!retainedUrl) return;
    getElement('gallery-overlay').classList.add('is-hidden');
    updateLiveUi();
  } catch (error) {
    if (request === runtime.galleryPreviewRequest)
      notify(error instanceof Error ? error.message : 'The saved portrait could not be opened.');
  } finally {
    if (!retainedUrl) URL.revokeObjectURL(url);
    if (request === runtime.galleryPreviewRequest) runtime.pendingGalleryPreviewId = null;
  }
}
