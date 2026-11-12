import type { MessagePosition } from "../../../lib/types";
import { renderArtwork } from "../artwork/render-artwork";
import { elements } from "../dom/elements";
import { model } from "../state/model";
import { bindRange } from "./bind-range";
import { isPositionLocked } from "../../../lib/config";
import { updateLiveUi } from "../ui/update-live-ui";

/** Connect message content, placement, scale, and signature controls. */
export function bindMessageEvents(): void {
  elements.messageEnabled.addEventListener("change", () => {
    model.messageEnabled = elements.messageEnabled.checked;
    elements.messageControls.classList.toggle("is-disabled", !model.messageEnabled);
    renderArtwork();
  });
  elements.messageText.addEventListener("input", () => {
    model.message = elements.messageText.value;
    model.messageOrigin = null;
    renderArtwork();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-position]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isPositionLocked(model.config, "message")) return;
      model.messagePosition = button.dataset.position as MessagePosition;
      model.messageOrigin = null;
      renderArtwork();
      updateLiveUi();
    });
  });
  bindRange(elements.messageScale, elements.messageScaleValue, (value) => {
    model.messageScale = value;
    renderArtwork();
  });
  elements.showBadge.addEventListener("change", () => {
    model.showBadge = elements.showBadge.checked;
    renderArtwork();
  });
}
