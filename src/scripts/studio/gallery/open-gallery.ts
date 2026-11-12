import { getElement } from '../dom/get-element';
import { notify } from '../ui/notify';
import { refreshGallery } from './refresh-gallery';

/** Refresh and reveal the local gallery, reporting storage failures to the visitor. */
export async function openGallery(): Promise<void> {
  try {
    await refreshGallery();
    getElement('gallery-overlay').classList.remove('is-hidden');
  } catch (error) {
    console.error('The local portrait gallery could not be opened.', error);
    notify(error instanceof Error ? error.message : 'The portrait gallery could not be opened.');
  }
}
