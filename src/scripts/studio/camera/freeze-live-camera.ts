import { model } from "../state/model";
import { freezeLiveFrame } from "./freeze-live-frame";
import { startLiveCamera } from "./start-live-camera";

/** Capture the active live portrait, or start a new live session when the camera is idle. */
export function freezeLiveCamera(): void {
  if (!model.liveCameraActive) {
    void startLiveCamera();
    return;
  }
  freezeLiveFrame();
}
