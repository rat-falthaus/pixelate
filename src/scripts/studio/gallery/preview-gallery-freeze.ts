import type { GalleryFreeze } from '../../../lib/local-store';
import { getElement } from '../dom/get-element';
import { setImageSource } from '../photo/set-image-source';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { updateLiveUi } from '../ui/update-live-ui';

/** Decode a stored portrait for stage preview while retaining ownership of its object URL. */
export async function previewGalleryFreeze(freeze: GalleryFreeze): Promise<void> {
  const url = URL.createObjectURL(freeze.blob);
  const image = new Image();
  let retainedUrl = false;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This saved portrait could not be opened.'));
      image.src = url;
    });
    getElement('gallery-overlay').classList.add('is-hidden');
    if (model.liveCameraActive) {
      window.clearTimeout(runtime.freezePreviewTimer);
      model.freezePreview = true;
      setImageSource(image, 'gallery-portrait.png', url);
      updateLiveUi();
    } else {
      setImageSource(image, 'gallery-portrait.png', url);
    }
    retainedUrl = true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The saved portrait could not be opened.');
  } finally {
    if (!retainedUrl) URL.revokeObjectURL(url);
  }
}
