import { createHandLandmarker } from '../../../lib/gesture';
import { elements } from '../dom/elements';
import { setImageSource } from '../photo/set-image-source';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { updateLiveUi } from '../ui/update-live-ui';
import { drawCameraFrame } from './draw-camera-frame';
import { updateLiveFrame } from './update-live-frame';

/** Request fullscreen video, initialize the bundled hand model, and start local rendering. */
export async function startLiveCamera(): Promise<void> {
  elements.liveCameraError.classList.add('is-hidden');
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.liveCameraError.textContent =
      'Camera access is unavailable here. Choose a photo instead.';
    elements.liveCameraError.classList.remove('is-hidden');
    notify('Camera access is unavailable. Choose a photo instead.');
    return;
  }

  let fullscreenRequest = Promise.resolve(Boolean(document.fullscreenElement));
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try {
      fullscreenRequest = document.documentElement
        .requestFullscreen()
        .then(() => true)
        .catch(() => false);
    } catch {
      fullscreenRequest = Promise.resolve(false);
    }
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    elements.liveCameraVideo.srcObject = stream;
    await elements.liveCameraVideo.play();
    if (!elements.liveCameraVideo.videoWidth) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error('The camera preview did not become ready.')),
          5000,
        );
        elements.liveCameraVideo.addEventListener(
          'loadeddata',
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }

    runtime.liveCameraStream = stream;
    stream = null;
    runtime.liveFrameCanvas = document.createElement('canvas');
    if (!drawCameraFrame(elements.liveCameraVideo, runtime.liveFrameCanvas, 900)) {
      throw new Error('The camera did not provide an image.');
    }
    try {
      runtime.handLandmarker ??= await createHandLandmarker(import.meta.env.BASE_URL);
    } catch (error) {
      console.error('Offline hand gesture recognition could not be initialized.', error);
      notify('Gesture recognition is unavailable. Use the capture button instead.');
    }
    model.liveCameraActive = true;
    model.freezePreview = false;
    setImageSource(runtime.liveFrameCanvas, 'live-portrait.png');
    runtime.lastLiveFrameAt = 0;
    runtime.liveFrameRequest = requestAnimationFrame(updateLiveFrame);
    const enteredFullscreen = await fullscreenRequest;
    notify(
      enteredFullscreen
        ? 'Live portrait is ready. Tap “Snap & freeze” to keep it.'
        : 'Live portrait is ready. Fullscreen is unavailable here; tap “Snap & freeze” to keep it.',
    );
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    runtime.liveCameraStream?.getTracks().forEach((track) => track.stop());
    runtime.liveCameraStream = null;
    runtime.liveFrameCanvas = null;
    elements.liveCameraVideo.srcObject = null;
    model.liveCameraActive = false;
    const message = error instanceof Error ? error.message : 'Camera access was denied.';
    elements.liveCameraError.textContent = `${message} You can still choose a photo.`;
    elements.liveCameraError.classList.remove('is-hidden');
    updateLiveUi();
    notify(`${message} You can still choose a photo.`);
  }
}
