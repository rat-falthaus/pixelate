import { isOpenPalm } from '../../../lib/gesture';
import { rebuildArtwork } from '../artwork/rebuild-artwork';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { beginFreezeCountdown } from './begin-freeze-countdown';
import { drawCameraFrame } from './draw-camera-frame';

/** Throttle live mosaic sampling and open-palm inference within the animation loop. */
export function updateLiveFrame(timestamp: number): void {
  if (!model.liveCameraActive || !runtime.liveFrameCanvas) return;
  if (timestamp - runtime.lastLiveFrameAt >= 180) {
    if (!model.freezePreview && elements.liveCameraVideo.videoWidth) {
      const previousWidth = runtime.liveFrameCanvas.width;
      const previousHeight = runtime.liveFrameCanvas.height;
      if (drawCameraFrame(elements.liveCameraVideo, runtime.liveFrameCanvas, 900)) {
        rebuildArtwork(
          previousWidth !== runtime.liveFrameCanvas.width ||
            previousHeight !== runtime.liveFrameCanvas.height,
        );
      }
    }
    runtime.lastLiveFrameAt = timestamp;
  }
  if (
    !model.freezePreview &&
    runtime.handLandmarker &&
    timestamp - runtime.lastGestureFrameAt >= 140
  ) {
    runtime.lastGestureFrameAt = timestamp;
    if (elements.liveCameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const result = runtime.handLandmarker.detectForVideo(elements.liveCameraVideo, timestamp);
      if (result.landmarks[0] && isOpenPalm(result.landmarks[0])) {
        const wrist = result.landmarks[0][0];
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
      }
    }
  }
  runtime.liveFrameRequest = requestAnimationFrame(updateLiveFrame);
}
