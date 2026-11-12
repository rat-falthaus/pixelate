import { rebuildArtwork } from '../artwork/rebuild-artwork';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { drawCameraFrame } from './draw-camera-frame';
import { updateSubjectMask } from '../recognition/update-subject-mask';
import { updateCaptureGesture } from './update-capture-gesture';
import { stopLiveCamera } from './stop-live-camera';
import { notify } from '../ui/notify';

/** Throttle live mosaic sampling and open-palm inference within the animation loop. */
export function updateLiveFrame(timestamp: number): void {
  if (!model.liveCameraActive || !runtime.liveFrameCanvas) return;
  if (timestamp - runtime.lastLiveFrameAt >= 180) {
    if (!model.freezePreview && elements.liveCameraVideo.videoWidth) {
      const previousWidth = runtime.liveFrameCanvas.width;
      const previousHeight = runtime.liveFrameCanvas.height;
      try {
        if (drawCameraFrame(elements.liveCameraVideo, runtime.liveFrameCanvas, 900)) {
          const resized =
            previousWidth !== runtime.liveFrameCanvas.width ||
            previousHeight !== runtime.liveFrameCanvas.height;
          if (resized || timestamp - runtime.lastSubjectFrameAt >= 350) {
            updateSubjectMask(runtime.liveFrameCanvas);
            runtime.lastSubjectFrameAt = performance.now();
          }
          rebuildArtwork(resized);
        }
      } catch (error) {
        console.error('Live camera rendering stopped.', error);
        stopLiveCamera(false);
        notify(
          error instanceof Error ? error.message : 'The live camera could not provide a frame.',
        );
        return;
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
    updateCaptureGesture(timestamp);
  }
  runtime.liveFrameRequest = requestAnimationFrame(updateLiveFrame);
}
