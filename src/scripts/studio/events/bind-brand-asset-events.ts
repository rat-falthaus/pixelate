import { deleteBrandAsset } from "../../../lib/local-store";
import { persistSettings } from "../admin/persist-settings";
import { renderArtwork } from "../artwork/render-artwork";
import { uploadFont } from "../branding/upload-font";
import { uploadLogo } from "../branding/upload-logo";
import { renderBrandIdentity } from "../branding/render-brand-identity";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { notify } from "../ui/notify";
import type { MessagePosition } from "../../../lib/types";
import { updateLiveUi } from "../ui/update-live-ui";
import { isPositionLocked } from "../../../lib/config";

/** Connect admin logo and font uploads and asset-removal controls. */
export function bindBrandAssetEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-logo-position]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isPositionLocked(model.config, "logo")) return;
      model.config.logoPosition = button.dataset.logoPosition as MessagePosition;
      model.logoOrigin = null;
      renderArtwork();
      updateLiveUi();
    });
  });
  getElement("setting-logo-file").addEventListener("change", () => {
    const file = (getElement("setting-logo-file") as HTMLInputElement).files?.[0];
    if (file)
      void uploadLogo(file).catch((error: unknown) =>
        notify(error instanceof Error ? error.message : "The logo could not be uploaded."),
      );
    (getElement("setting-logo-file") as HTMLInputElement).value = "";
  });
  getElement("setting-font-file").addEventListener("change", () => {
    const file = (getElement("setting-font-file") as HTMLInputElement).files?.[0];
    if (file)
      void uploadFont(file).catch((error: unknown) =>
        notify(error instanceof Error ? error.message : "The font could not be uploaded."),
      );
    (getElement("setting-font-file") as HTMLInputElement).value = "";
  });
  getElement("remove-logo").addEventListener("click", () => {
    const id = model.config.logoAssetId;
    model.config.logoAssetId = null;
    model.logoDataUrl = null;
    model.logoOrigin = null;
    if (id)
      void deleteBrandAsset(id).catch((error: unknown) => {
        console.error("The saved logo could not be removed.", error);
        notify("The saved logo could not be removed from local storage.");
      });
    persistSettings();
    (getElement("setting-logo-preview") as HTMLImageElement).removeAttribute("src");
    getElement("setting-logo-preview").classList.add("is-hidden");
    renderBrandIdentity();
    renderArtwork();
  });
  getElement("remove-font").addEventListener("click", () => {
    const id = model.config.fontAssetId;
    model.config.fontAssetId = null;
    model.config.useUploadedFont = false;
    model.fontFamily = "Arial, Helvetica, sans-serif";
    model.fontDataUri = null;
    if (id)
      void deleteBrandAsset(id).catch((error: unknown) => {
        console.error("The saved font could not be removed.", error);
        notify("The saved font could not be removed from local storage.");
      });
    persistSettings();
    getElement("setting-font-name").textContent = "System font";
    (getElement("setting-font-choice") as HTMLSelectElement).value = "system";
    renderArtwork();
  });
}
