import { elements } from "../dom/elements";
import { model } from "../state/model";
import { getElement } from "../dom/get-element";
import { updateFullscreenUi } from "../ui/update-fullscreen-ui";
import { toggleFullscreen } from "../viewport/toggle-fullscreen";
import { enterPublicKiosk } from "../viewport/enter-public-kiosk";
import { leavePublicKiosk } from "../viewport/leave-public-kiosk";
import { handleFullscreenChange } from "./handle-fullscreen-change";

/** Connect photo comparison and public fullscreen controls without image zoom or panning. */
export function bindViewportEvents(): void {
  getElement("studio-fullscreen").addEventListener("click", () => void toggleFullscreen());
  getElement("live-fullscreen").addEventListener("click", () => void toggleFullscreen());
  getElement("studio-kiosk").addEventListener("click", () => void enterPublicKiosk());
  getElement("live-leave-kiosk").addEventListener("click", leavePublicKiosk);
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  updateFullscreenUi();
  elements.comparePhoto.addEventListener("click", () => {
    model.showOriginal = !model.showOriginal;
    elements.originalPhoto.hidden = !model.showOriginal;
    elements.comparePhoto.classList.toggle("is-selected", model.showOriginal);
    elements.comparePhoto.textContent = model.showOriginal ? "Showing photo" : "Compare photo";
  });
}
