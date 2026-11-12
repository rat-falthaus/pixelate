import { isOpenPalm } from "../../../lib/gesture";
import { elements } from "../dom/elements";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";
import { beginFreezeCountdown } from "./begin-freeze-countdown";
import { model } from "../state/model";
import { updateLiveUi } from "../ui/update-live-ui";

/** Detect a steady open palm while isolating inference failures from the live-render loop. */
export function updateCaptureGesture(timestamp: number): void {
  if (
    !model.liveCameraActive ||
    model.freezePreview ||
    runtime.gestureCountdownTimer ||
    !runtime.handLandmarker ||
    elements.liveCameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  )
    return;
  try {
    const result = runtime.handLandmarker.detectForVideo(elements.liveCameraVideo, timestamp);
    const hand = result.landmarks.find(isOpenPalm);
    if (hand) {
      if (!runtime.gestureArmed) return;
      const wrist = hand[0];
      if (
        runtime.gesturePalmPoint &&
        Math.hypot(wrist.x - runtime.gesturePalmPoint.x, wrist.y - runtime.gesturePalmPoint.y) >
          0.08
      ) {
        runtime.gestureStartedAt = 0;
      }
      runtime.gesturePalmPoint = { x: wrist.x, y: wrist.y };
      if (!runtime.gestureStartedAt) runtime.gestureStartedAt = timestamp;
      if (timestamp - runtime.gestureStartedAt >= 700) beginFreezeCountdown();
    } else {
      runtime.gestureStartedAt = 0;
      runtime.gesturePalmPoint = null;
      if (!runtime.gestureArmed) {
        runtime.gestureArmed = true;
        updateLiveUi();
      }
    }
  } catch (error) {
    console.error("Hand gesture recognition stopped.", error);
    runtime.handLandmarker.close();
    runtime.handLandmarker = null;
    runtime.gestureStartedAt = 0;
    runtime.gesturePalmPoint = null;
    runtime.gestureArmed = true;
    updateLiveUi();
    notify("Gesture recognition stopped. The live camera and capture button remain available.");
  }
}
