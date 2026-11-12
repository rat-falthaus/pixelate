import { deleteGalleryFreeze, listGalleryFreezes } from '../../../lib/local-store';
import { getElement } from '../dom/get-element';
import { downloadBlob } from '../sharing/download-blob';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { refreshGallery } from './refresh-gallery';

/** Share selected PNGs and schedule cleanup only after native sharing succeeds. */
export async function shareSelectedGalleryFreezes(): Promise<void> {
  if (!navigator.share) {
    try {
      const freezes = await listGalleryFreezes();
      const selected = freezes.filter((freeze) => runtime.selectedGalleryIds.has(freeze.id));
      if (!selected.length) {
        notify('Select at least one portrait to save.');
        return;
      }
      selected.forEach((freeze, index) =>
        downloadBlob(freeze.blob, `pixel-portrait-${index + 1}.png`),
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Selected portraits could not be saved.');
    }
    return;
  }
  try {
    const freezes = await listGalleryFreezes();
    const selected = freezes.filter((freeze) => runtime.selectedGalleryIds.has(freeze.id));
    if (!selected.length) {
      notify('Select at least one portrait to share.');
      return;
    }
    const files = selected.map(
      (freeze, index) =>
        new File([freeze.blob], `pixel-portrait-${index + 1}.png`, { type: 'image/png' }),
    );
    if (!navigator.canShare?.({ files })) {
      notify('This device cannot share the selected image files.');
      return;
    }
    await navigator.share({ files, title: model.config.applicationTitle });
    getElement('gallery-overlay').classList.add('is-hidden');
    if (model.config.clearGalleryAfterShare) {
      const ids = selected.map((freeze) => freeze.id);
      window.setTimeout(() => {
        void Promise.all(ids.map((id) => deleteGalleryFreeze(id)))
          .then(() => {
            ids.forEach((id) => runtime.selectedGalleryIds.delete(id));
            return refreshGallery();
          })
          .catch((error: unknown) => {
            console.error('Shared gallery portraits could not be removed.', error);
            notify('Shared portraits could not be removed from local storage.');
          });
      }, model.config.galleryClearDelaySeconds * 1000);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.error('Selected gallery portraits could not be shared.', error);
    notify(error instanceof Error ? error.message : 'Selected portraits could not be shared.');
  }
}
