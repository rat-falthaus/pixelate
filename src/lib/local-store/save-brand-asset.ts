import { createId } from "./create-id";
import { requestInStore } from "./request-in-store";
import { BRAND_ASSETS } from "./state";
import type { StoredBrandAsset } from "./types";

/** Persist a logo or font blob, preserving a supplied asset identifier when present. */
export async function saveBrandAsset(
  asset: Omit<StoredBrandAsset, "id"> & { id?: string },
): Promise<StoredBrandAsset> {
  const stored: StoredBrandAsset = { ...asset, id: asset.id ?? createId() };
  await requestInStore(BRAND_ASSETS, "readwrite", (store) => store.put(stored));
  return stored;
}
