import { elements } from "../dom/elements";
import { renderBrandIdentity } from "../branding/render-brand-identity";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { isOverlayPositionLocked } from "../state/is-overlay-position-locked";
import { isKioskMode } from "../state/is-kiosk-mode";

/** Synchronize camera status, empty-state visibility, and visitor position locks. */
export function updateLiveUi(): void {
  const fairMode = isKioskMode();
  const hasArtwork = Boolean(model.image);
  renderBrandIdentity();
  elements.emptyState.classList.toggle("is-hidden", hasArtwork || fairMode);
  elements.livePrompt.classList.toggle("is-hidden", !fairMode || hasArtwork);
  elements.liveIndicator.classList.toggle("is-active", model.liveCameraActive);
  elements.liveStatus.textContent = model.liveCameraActive
    ? model.freezePreview
      ? "Portrait preview"
      : "Live portrait"
    : hasArtwork
      ? "Portrait ready"
      : "Fair portrait studio";
  if (fairMode) {
    elements.liveStatus.textContent = `${model.config.fairMode ? "Admin kiosk" : "Kiosk preview"} · ${elements.liveStatus.textContent}`;
  }
  getElement("live-camera-label").textContent = model.liveCameraActive
    ? "Snap & freeze"
    : "New portrait";
  getElement("live-camera").setAttribute(
    "aria-label",
    model.liveCameraActive ? "Freeze this portrait" : "Start a new portrait",
  );
  const studioCamera = getElement<HTMLButtonElement>("studio-live-camera");
  studioCamera.textContent = runtime.liveCameraStarting
    ? "Starting camera..."
    : model.liveCameraActive
      ? "Snap & freeze"
      : "Start live camera";
  studioCamera.disabled = runtime.liveCameraStarting;
  getElement("studio-stop-live").classList.toggle(
    "is-hidden",
    !model.liveCameraActive && !runtime.liveCameraStarting,
  );
  elements.comparePhoto.disabled =
    (model.liveCameraActive && !model.freezePreview) || Boolean(runtime.previewFreeze);
  getElement("return-to-live").classList.toggle("is-hidden", !model.freezePreview);
  getElement("freeze-preview-actions").classList.toggle("is-hidden", !model.freezePreview);
  getElement("stage-hint").classList.toggle("is-hidden", model.liveCameraActive);
  const gestureStatus = getElement("gesture-status");
  gestureStatus.classList.toggle("is-hidden", !model.liveCameraActive || model.freezePreview);
  gestureStatus.textContent = runtime.handLandmarker
    ? runtime.gestureArmed
      ? "Hold an open palm briefly to start the 3-2-1 countdown."
      : "Lower your hand before the next gesture."
    : runtime.handLandmarkerLoading
      ? "Loading hand gesture recognition..."
      : "Gesture capture unavailable. Use Snap & freeze.";
  getElement("logo-section").classList.toggle(
    "is-hidden",
    isOverlayPositionLocked("logo") || (!model.logoDataUrl && !model.config.brandSignature),
  );
  getElement("drawer-open").setAttribute(
    "aria-expanded",
    String(document.body.classList.contains("drawer-open")),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-position]").forEach((button) => {
    button.disabled = isOverlayPositionLocked("message");
    const selected = button.dataset.position === model.messagePosition;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-logo-position]").forEach((button) => {
    button.disabled = isOverlayPositionLocked("logo");
    button.classList.toggle(
      "is-selected",
      button.dataset.logoPosition === model.config.logoPosition,
    );
  });
}
