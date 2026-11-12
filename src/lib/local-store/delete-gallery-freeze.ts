import { requestInStore } from './request-in-store';
import { GALLERY_FREEZES } from './state';

/** Delete one saved portrait and await the transaction commit. */
export async function deleteGalleryFreeze(id: string): Promise<void> {
  await requestInStore(GALLERY_FREEZES, 'readwrite', (store) => store.delete(id));
}
