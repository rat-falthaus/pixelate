import { closeCamera } from "../camera/close-camera";
import { refreshCameraDevices } from "../camera/refresh-camera-devices";
import { stopLiveCamera } from "../camera/stop-live-camera";
import { model } from "../state/model";
import { fitArtboard } from "../viewport/fit-artboard";
import { elements } from "../dom/elements";
import { handleEscapeKey } from "./handle-escape-key";

/** Fit on resize, release camera tracks on page exit, and dismiss the drawer on Escape. */
export function bindLifecycleEvents(): void {
  window.addEventListener("resize", fitArtboard);
  new ResizeObserver(fitArtboard).observe(elements.stage);
  navigator.mediaDevices?.addEventListener("devicechange", () => void refreshCameraDevices());
  window.addEventListener("pagehide", () => {
    closeCamera();
    if (model.liveCameraActive) stopLiveCamera(false);
  });
  window.addEventListener("keydown", handleEscapeKey);
}
