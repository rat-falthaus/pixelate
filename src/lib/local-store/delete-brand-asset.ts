import { requestInStore } from "./request-in-store";
import { BRAND_ASSETS } from "./state";

/** Delete a stored brand asset and await the transaction commit. */
export async function deleteBrandAsset(id: string): Promise<void> {
  await requestInStore(BRAND_ASSETS, "readwrite", (store) => store.delete(id));
}
