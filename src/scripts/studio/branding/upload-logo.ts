import { deleteBrandAsset, saveBrandAsset } from "../../../lib/local-store";
import { persistSettings } from "../admin/persist-settings";
import { renderArtwork } from "../artwork/render-artwork";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { notify } from "../ui/notify";
import { rasterizeLogo } from "./rasterize-logo";
import { renderBrandIdentity } from "./render-brand-identity";
import { sanitizeSvgLogo } from "./sanitize-svg-logo";

/** Rasterize and persist an uploaded logo, then replace the previous stored asset. */
export async function uploadLogo(file: File): Promise<void> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Logo files must be 5 MB or smaller.");
  const source =
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
      ? await sanitizeSvgLogo(file)
      : file;
  const raster = await rasterizeLogo(source);
  const asset = await saveBrandAsset({
    kind: "logo",
    name: file.name,
    type: raster.blob.type,
    blob: raster.blob,
    width: raster.width,
    height: raster.height,
  });
  if (model.config.logoAssetId) await deleteBrandAsset(model.config.logoAssetId);
  model.config.logoAssetId = asset.id;
  model.logoDataUrl = raster.dataUrl;
  model.logoAspectRatio = raster.width / raster.height;
  model.logoOrigin = null;
  persistSettings();
  const preview = getElement("setting-logo-preview") as HTMLImageElement;
  preview.src = raster.dataUrl;
  preview.classList.remove("is-hidden");
  renderBrandIdentity();
  renderArtwork();
  notify("Brand logo saved on this device.");
}
