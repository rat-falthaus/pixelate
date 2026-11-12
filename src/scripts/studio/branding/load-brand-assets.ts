import { getBrandAsset } from "../../../lib/local-store";
import { model } from "../state/model";
import { rasterizeLogo } from "./rasterize-logo";
import { readBlobAsDataUrl } from "./read-blob-as-data-url";

/** Restore the configured logo and font from IndexedDB into browser rendering state. */
export async function loadBrandAssets(): Promise<void> {
  if (model.config.logoAssetId) {
    const asset = await getBrandAsset(model.config.logoAssetId);
    if (asset?.kind === "logo") {
      const raster = await rasterizeLogo(asset.blob);
      model.logoDataUrl = raster.dataUrl;
      model.logoAspectRatio =
        asset.width && asset.height ? asset.width / asset.height : raster.width / raster.height;
    }
  }

  if (model.config.fontAssetId) {
    const asset = await getBrandAsset(model.config.fontAssetId);
    if (asset?.kind === "font") {
      const objectUrl = URL.createObjectURL(asset.blob);
      try {
        const face = new FontFace("BrandUploaded", `url("${objectUrl}")`);
        await face.load();
        document.fonts.add(face);
        model.fontDataUri = await readBlobAsDataUrl(asset.blob);
        model.fontFamily = "BrandUploaded";
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }
}
