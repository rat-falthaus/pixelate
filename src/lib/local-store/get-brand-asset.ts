import { requestInStore } from './request-in-store';
import { BRAND_ASSETS } from './state';
import type { StoredBrandAsset } from './types';

/** Read a stored logo or font by identifier. */
export async function getBrandAsset(id: string): Promise<StoredBrandAsset | undefined> {
  return requestInStore(BRAND_ASSETS, 'readonly', (store) => store.get(id));
}
