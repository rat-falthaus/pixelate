import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { setImageSource } from '../photo/set-image-source';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { updateLiveUi } from '../ui/update-live-ui';
import { drawCameraFrame } from './draw-camera-frame';

/** Cancel live capture resources, optionally retaining a higher-resolution frozen frame. */
export function stopLiveCamera(freeze: boolean): void {
  const shouldFreeze = freeze && model.liveCameraActive;
  let frozenFrame: HTMLCanvasElement | null = null;
  if (shouldFreeze && runtime.liveFrameCanvas && elements.liveCameraVideo.videoWidth) {
    frozenFrame = document.createElement('canvas');
    if (!drawCameraFrame(elements.liveCameraVideo, frozenFrame, 1500)) frozenFrame = null;
  }

  model.liveCameraActive = false;
  model.freezePreview = false;
  runtime.gestureStartedAt = 0;
  runtime.gesturePalmPoint = null;
  window.clearInterval(runtime.gestureCountdownTimer);
  window.clearTimeout(runtime.freezePreviewTimer);
  getElement('gesture-countdown').classList.add('is-hidden');
  cancelAnimationFrame(runtime.liveFrameRequest);
  runtime.liveFrameRequest = 0;
  runtime.liveCameraStream?.getTracks().forEach((track) => track.stop());
  runtime.liveCameraStream = null;
  elements.liveCameraVideo.srcObject = null;
  runtime.liveFrameCanvas = null;

  if (frozenFrame) {
    setImageSource(frozenFrame, `portrait-${new Date().toISOString().slice(0, 10)}.png`);
  } else if (!freeze) {
    model.image = null;
    updateLiveUi();
  } else {
    updateLiveUi();
  }
}
